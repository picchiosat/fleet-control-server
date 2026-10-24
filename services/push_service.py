import json
import queue
from contextlib import closing
from pywebpush import webpush, WebPushException
from core.config import config, logger
from core.database import db_connect

push_queue = queue.Queue(maxsize=200)

def node_allowed(role, allowed_nodes, cid):
    if role == 'admin':
        return True
    allowed = (allowed_nodes or '').strip().lower()
    if allowed == 'all':
        return True
    return cid in [x.strip().lower() for x in allowed.split(',') if x.strip()]

def broadcast_push_notification(title, body, cid=None):
    if not config.get('webpush'):
        return
    try:
        push_queue.put_nowait((title, body, cid))
    except queue.Full:
        logger.warning("Push queue piena: notifica scartata")

def _send_push(title, body, cid):
    wp_config = config.get('webpush')
    if not wp_config:
        return
    payload = json.dumps({"title": title, "body": body, "tag": cid or "fleet-alert"})
    dead = []

    with closing(db_connect()) as conn:
        rows = conn.execute("""SELECT p.id, p.subscription, u.role, u.allowed_nodes
                               FROM push_subscriptions p
                               LEFT JOIN users u ON u.username = p.username""").fetchall()
        for sub_id, sub_json, role, allowed in rows:
            if role is None:
                dead.append(sub_id)
                continue
            if cid and not node_allowed(role, allowed, cid):
                continue
            try:
                webpush(
                    subscription_info=json.loads(sub_json),
                    data=payload,
                    vapid_private_key=wp_config['vapid_private_key'],
                    vapid_claims={"sub": wp_config['vapid_claim_email']},
                    timeout=10
                )
            except WebPushException as ex:
                status = getattr(getattr(ex, 'response', None), 'status_code', None)
                if status in (404, 410):
                    dead.append(sub_id)
                else:
                    logger.warning(f"Push error (status {status}): {ex}")
            except Exception as e:
                logger.error(f"Generic Push Error: {e}")
        for sub_id in dead:
            conn.execute("DELETE FROM push_subscriptions WHERE id = ?", (sub_id,))
        if dead:
            conn.commit()

def push_worker():
    while True:
        title, body, cid = push_queue.get()
        try:
            _send_push(title, body, cid)
        except Exception as e:
            logger.error(f"Push worker error: {e}")
