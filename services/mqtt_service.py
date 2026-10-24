import json
import re
from paho.mqtt import client as mqtt_client
from core.config import config, logger
from core.database import save_to_sqlite
import core.state as state
from services.push_service import broadcast_push_notification

mqtt_connected_status = False

def on_connect(client, userdata, flags, reason_code, properties=None):
    global mqtt_connected_status
    if reason_code == 0:
        mqtt_connected_status = True
        logger.info("✅ Connessione al broker MQTT riuscita! Sottoscrizione ai topic...")
        state.socketio.emit('mqtt_status', {'connected': True})
        
        default_topics = [
            "servizi/+/stat", "dmr-gateway/+/json", "devices/+/services",
            "nxdn-gateway/+/json", "ysf-gateway/+/json", "p25-gateway/+/json",
            "dstar-gateway/+/json", "mmdvm/+/json", "data/#"
        ]
        
        topics_list = config.get('mqtt', {}).get('topics', default_topics)
        subscribe_list = [(topic, 0) for topic in topics_list]
        subscribe_list.append(("+/+/log", 0))
        
        client.subscribe(subscribe_list)
        logger.info(f"Sottoscritto a {len(subscribe_list)} topic MQTT.")
    else:
        mqtt_connected_status = False
        state.socketio.emit('mqtt_status', {'connected': False})
        logger.error(f"❌ Errore connessione MQTT. Reason code: {reason_code}")

def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    global mqtt_connected_status
    mqtt_connected_status = False
    state.socketio.emit('mqtt_status', {'connected': False})
    logger.warning(f"⚠️ Disconnessione MQTT rilevata! Codice: {reason_code}. Riconnessione automatica...")

def on_message(client, userdata, msg):
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8', errors='replace').strip()
        parts = topic.split('/')
        if len(parts) < 2:
            return
        
        cid = parts[1].lower()
        p0 = parts[0].lower().replace('-', '')
        p2 = parts[2].lower().replace('-', '') if len(parts) > 2 else ""

        # --- 1. LOG SOFTWARE & FIRMWARE ---
        if len(parts) >= 3 and parts[2].lower() == 'log':
            if cid not in state.node_versions:
                state.node_versions[cid] = {}
            
            m_fw = re.search(r'description:\s*(MMDVM[^\n\r]+)', payload, re.IGNORECASE)
            if m_fw:
                state.node_versions[cid]["Firmware MMDVM"] = m_fw.group(1).strip()
                state.notify_update()
                
            m_sw1 = re.search(r'([A-Za-z0-9_]+)-([a-zA-Z0-9.\-]+)\s+is starting', payload, re.IGNORECASE)
            if m_sw1:
                prog = m_sw1.group(1)
                state.node_versions[cid][prog] = m_sw1.group(2).strip()
                state.node_versions[cid]["_last_prog"] = prog
                state.notify_update()

            m_sw2 = re.search(r'([A-Za-z0-9_]+)\s+version\s+([a-zA-Z0-9.\-\s#]+)', payload, re.IGNORECASE)
            if m_sw2:
                prog = m_sw2.group(1)
                if prog.lower() not in ['protocol', 'firmware', 'mmdvm firmware']:
                    ver = m_sw2.group(2).replace("is starting", "").strip()
                    state.node_versions[cid][prog] = ver
                    state.node_versions[cid]["_last_prog"] = prog
                    state.notify_update()

            m_git = re.search(r'Built .*?\(GitID #([0-9a-fA-F]+)\)', payload, re.IGNORECASE)
            if m_git:
                git_id = m_git.group(1)
                last_prog = state.node_versions[cid].get("_last_prog")
                if last_prog and last_prog in state.node_versions[cid]:
                    if "GitID" not in state.node_versions[cid][last_prog]:
                        state.node_versions[cid][last_prog] += f" (GitID #{git_id})"
                        state.notify_update()
            return

        # Aggiornamento timestamp last_seen
        if p0 == 'mmdvm':
            state.touch_seen(cid, 'mmdvm')
        elif p0 in ('dmrgateway', 'nxdngateway', 'ysfgateway', 'p25gateway', 'dstargateway'):
            state.touch_seen(cid, 'gateway')
        elif p0 == 'devices' and p2 == 'services':
            state.touch_seen(cid, 'health')

        # --- 2. FILE CONFIGURAZIONE ---
        if p0 == 'data' and len(parts) >= 4 and parts[3].lower() == 'full_config':
            cid_conf = parts[1].lower()
            svc_name = parts[2].lower()
            if cid_conf not in state.device_configs:
                state.device_configs[cid_conf] = {}
            try:
                state.device_configs[cid_conf][svc_name] = json.loads(payload)
                logger.debug(f"Configurazione salvata per {cid_conf} -> {svc_name}")
            except Exception as e:
                logger.error(f"Errore parsing config JSON: {e}")

        # --- 3. STATO NODO (ONLINE / OFFLINE) ---
        elif p0 == 'servizi':
            state.client_states[cid] = payload
            state.notify_update()
            
            state_up = payload.upper()
            if state_up.startswith('OFFLINE'):
                if not msg.retain and state.last_notified_errors.get(f"{cid}_NODE") != 'OFFLINE':
                    broadcast_push_notification(f"💀 NODE OFFLINE: {cid.upper()}", "Connessione persa con il broker.", cid=cid)
                    state.last_notified_errors[f"{cid}_NODE"] = 'OFFLINE'
            elif state_up.startswith('ONLINE'):
                if state.last_notified_errors.get(f"{cid}_NODE") == 'OFFLINE':
                    broadcast_push_notification(f"🌤️ NODE ONLINE: {cid.upper()}", "Nodo nuovamente online.", cid=cid)
                    del state.last_notified_errors[f"{cid}_NODE"]

            if not state_up.startswith('OFF') and state_up != '':
                tel = state.client_telemetry.get(cid, {})
                if isinstance(tel, dict) and '🔄' in str(tel.get('ts1', '')):
                    state.client_telemetry[cid] = {"ts1": "Waiting...", "ts2": "Waiting...", "alt": ""}
                    state.save_cache(state.client_telemetry)

        # --- 4. TELEMETRIA AGENT & DEMONI ---
        elif p0 == 'devices' and len(parts) >= 3 and p2 == 'services':
            try:
                data = json.loads(payload)
                new_health = {
                    "cpu": round(data.get("cpu_usage_percent", 0), 1),
                    "temp": round(data.get("cpu_temp", 0), 1),
                    "ram": round(data.get("memory_usage_percent", 0), 1),
                    "disk": round(data.get("disk_usage_percent", 0), 1),
                    "processes": data.get("processes", {}),
                    "files": data.get("files", data.get("config_files", [])),
                    "file_names": data.get("file_names", []),
                    "profiles": data.get("profiles", {"A": "PROFILE A", "B": "PROFILE B"}),
                    "interval": data.get("update_interval"),
                    "uptime": data.get("uptime_seconds", 0),
                    "agent_version": data.get("agent_version", "1.0"),
                    "agent_update_available": data.get("agent_update_available", False)
                }
                bin_versions = data.get("versions", {})
                if bin_versions:
                    if cid not in state.node_versions:
                        state.node_versions[cid] = {}
                        
                    keys_to_remove = [k for k in state.node_versions[cid].keys() 
                                      if k not in bin_versions and k not in ["Firmware MMDVM", "_last_prog"]]
                    for k in keys_to_remove:
                        del state.node_versions[cid][k]
                        
                    for prog_name, prog_ver in bin_versions.items():
                        state.node_versions[cid][prog_name] = prog_ver

                health_changed = state.device_health.get(cid) != new_health
                state.device_health[cid] = new_health
                if health_changed:
                    state.notify_update()

                processes = data.get("processes", {})
                for svc_name, svc_status in processes.items():
                    status_key = f"{cid}_{svc_name}"
                    s_lower = svc_status.lower()
                    if s_lower in ["error", "stopped", "failed"]:
                        if state.last_notified_errors.get(status_key) != s_lower:
                            msg_err = f"Servizio {svc_name} KO ({svc_status})"
                            if s_lower == "error":
                                msg_err += " - Auto-healing fallito! ⚠️"
                            broadcast_push_notification(f"🚨 ALLARME: {cid.upper()}", msg_err, cid=cid)
                            state.last_notified_errors[status_key] = s_lower
                    elif s_lower == "online" and status_key in state.last_notified_errors:
                        broadcast_push_notification(f"✅ RIPRISTINATO: {cid.upper()}", f"Servizio {svc_name} tornato ONLINE.", cid=cid)
                        del state.last_notified_errors[status_key]

            except Exception as e: 
                logger.error(f"Errore parsing telemetria agent: {e}")

        # --- 5. INFO FREQUENZE E GEOLOCALIZZAZIONE ---
        elif len(parts) >= 4 and p0 == 'data' and p2 in ('mmdvm', 'mmdvmhost') and parts[3].lower() == 'info':
            try:
                cid = parts[1].lower()
                data = json.loads(payload)
                
                tx = data.get("TXFrequency", "0")
                rx = data.get("RXFrequency", "0")
                lat = data.get("Latitude", "0.0")
                lon = data.get("Longitude", "0.0")
                loc = data.get("Location", "Sconosciuta")
                
                def format_freq(f):
                    if str(f).isdigit() and int(f) > 0:
                        hz = int(f)
                        mhz, frac = divmod(hz, 1000000)
                        dec = f"{frac:06d}"
                        if dec.endswith("0"):
                            dec = dec[:-1]
                        return f"{mhz}.{dec} MHz"
                    return str(f)
                    
                state.node_info[cid] = {
                    "tx": format_freq(tx), 
                    "rx": format_freq(rx),
                    "lat": lat,
                    "lon": lon,
                    "loc": loc
                }
                state.notify_update()
            except Exception as e:
                logger.error(f"Errore parsing MMDVMHost info per {cid}: {e}")

        # --- 6. INFO GENERALI (CALLSIGN & RADIO ID) ---
        elif len(parts) >= 4 and p0 == 'data' and p2 in ('mmdvm', 'mmdvmhost') and parts[3].lower() == 'general':
            try:
                cid = parts[1].lower()
                data = json.loads(payload)
                callsign = data.get("Callsign", "")
                radio_id = data.get("Id", "")
                duplex = data.get("Duplex", "1")
                
                if callsign:
                    state.node_general[cid] = {"callsign": callsign, "radio_id": radio_id, "duplex": str(duplex)}
                    state.notify_update()
            except Exception as e:
                logger.error(f"Errore parsing MMDVMHost general per {cid}: {e}")

        # --- 7. EVENTI GATEWAY (LINKING / UNLINKING) ---
        elif p0 in ['dmrgateway', 'nxdngateway', 'ysfgateway', 'p25gateway', 'dstargateway']:
            data = json.loads(payload)
            proto = "DMR"
            if "nxdn" in p0: proto = "NXDN"
            elif "ysf" in p0: proto = "YSF"
            elif "p25" in p0: proto = "P25"
            elif "dstar" in p0: proto = "D-STAR"
            
            if cid not in state.gateway_states:
                state.gateway_states[cid] = {}
            
            if 'status' in data:
                state.gateway_states[cid][proto] = {"action": "status", "dest": data['status'].get('message', 'IDLE')}
                state.notify_update()
            elif 'link' in data:
                l = data['link']
                g_dest = str(l.get('reflector') or l.get('talkgroup') or '---').strip()
                g_action = l.get('action', '')
                state.gateway_states[cid][proto] = {"action": g_action, "dest": g_dest}
                state.notify_update()
            
            m = ""
            if 'status' in data: 
                m = data['status'].get('message', '')
            elif 'link' in data:
                l = data['link']
                dest = str(l.get('reflector') or l.get('talkgroup') or '---').strip()
                action = l.get('action')
                if action == 'linking':
                    state.last_seen_reflector[f"{cid}_{proto}"] = dest
                elif action == 'unlinking':
                    state.last_seen_reflector[f"{cid}_{proto}"] = "---"
                m = f"{'Link' if action=='linking' else 'Unlinked'} {dest}"
            
            if m:
                save_to_sqlite(cid, {'src_id': "🌐 " + m, 'dst_id': 'NET'}, protocol=proto)

        # --- 8. TRAFFICO VOCE MMDVM (DMR & MODI DIGITALI) ---
        elif parts[0] == 'mmdvm':
            data = json.loads(payload)
            if cid not in state.active_calls:
                state.active_calls[cid] = {}
            if cid not in state.client_telemetry or not isinstance(state.client_telemetry.get(cid), dict):
                state.client_telemetry[cid] = {"ts1": "Waiting...", "ts2": "Waiting...", "alt": "", "idle": True}

            if 'MMDVM' in data and data['MMDVM'].get('mode') == 'idle':
                state.client_telemetry[cid]["idle"] = True
                state.save_cache(state.client_telemetry)
                return 

            state.client_telemetry[cid]["idle"] = False

            if 'DMR' in data:
                d = data['DMR']
                act = d.get('action')
                sk = f"ts{d.get('slot', 1)}"
                if act in ['start', 'late_entry']:
                    src = state.get_call(d.get('src_id'))
                    dst = str(d.get('dst_id'))
                    
                    state.active_calls[cid][sk] = {
                        'src': src, 
                        'dst': dst,
                        'slot': d.get('slot', 1),
                        'ext': str(d.get('src_ext', '')),
                        'source': str(d.get('source', '')),
                        'mode': str(d.get('mode', ''))
                    }
                    
                    state.client_telemetry[cid]["alt"] = ""
                    state.client_telemetry[cid][sk] = f"🎙️ {src} ➔ TG {dst}"
                    state.notify_update()
                    
                elif act in ['end', 'lost']:
                    info = state.active_calls[cid].get(sk, {'src': '---', 'dst': '---', 'slot': d.get('slot', 1), 'ext': '', 'source': '', 'mode': ''})
                    
                    d.update({
                        'src_id': info['src'], 
                        'dst_id': info['dst'],
                        'slot': info['slot'],
                        'src_ext': info['ext'],
                        'source': info['source'],
                        'mode': info['mode']
                    })
                    
                    save_to_sqlite(cid, d, protocol="DMR")
                    state.client_telemetry[cid][sk] = f"{'✅' if act=='end' else '⚠️'} {info['src']}"
                    state.save_cache(state.client_telemetry)
                    if sk in state.active_calls[cid]:
                        del state.active_calls[cid][sk]
            else:
                for k, ico, name in [('NXDN','🟢','NXDN'),('YSF','🟣','YSF'),('P25','🟠','P25'),('D-Star','🔵','D-STAR')]:
                    if k in data:
                        p = data[k]
                        act = p.get('action')
                        
                        if act == 'start':
                            if k == 'NXDN':
                                src = state.get_call(p.get('src_id', '---'), 'NXDN')
                            elif k == 'P25':
                                src = state.get_call(p.get('src_id', '---'), 'DMR')
                            else:
                                src = str(p.get('Callsign', p.get('src_callsign', p.get('src_info', p.get('src_id', '---')))))
                            
                            raw_target = str(p.get('dst_callsign', p.get('dst_id', ''))).strip()
                            
                            if name == 'D-STAR':
                                target = raw_target if raw_target else "---"
                            else:
                                target = raw_target if raw_target not in ['', '0', 'ALL'] else "---"
                            if name == 'YSF' and 'dg-id' in p:
                                dg_id = str(p.get('dg-id')).strip()
                                if dg_id:
                                    target = f"DG-ID {dg_id}" if target == "---" else f"{target} (DG {dg_id})"
                            
                            mem_ref = state.last_seen_reflector.get(f"{cid}_{name}", "---")
                            pack_ref = str(p.get('reflector', '')).strip()
                            ref_slot = mem_ref if mem_ref != "---" else (pack_ref if pack_ref else "---")

                            state.active_calls[cid][k] = {'src': src, 'dst': target, 'slot': ref_slot, 'ext': str(p.get('src_ext', '')), 'source': str(p.get('source', '')), 'mode': str(p.get('mode', ''))}
                            
                            target_str = target if target != "---" else "NET"
                            state.client_telemetry[cid].update({"ts1":"","ts2":"","alt": f"{ico} {name}: {src} ➔ {target_str} ({ref_slot})"})
                            state.notify_update()
                        
                        elif act in ['end', 'lost']:
                            info = state.active_calls[cid].get(k, {'src': '---', 'dst': '---', 'slot': '---', 'ext': '', 'source': '', 'mode': ''})
                            
                            p.update({'src_id': info['src'], 'dst_id': info['dst'], 'slot': info['slot'], 'src_ext': info['ext'], 'source': info['source'], 'mode': info['mode']})
                            
                            save_to_sqlite(cid, p, protocol=name)
                            state.client_telemetry[cid]["alt"] = f"{'✅' if act=='end' else '⚠️'} {name}: {info['src']}"
                            state.save_cache(state.client_telemetry)
                            if k in state.active_calls[cid]:
                                del state.active_calls[cid][k]
    except Exception as e: 
        logger.error(f"MQTT MSG ERROR: {e}")

# Inizializzazione Client MQTT
mqtt_id = config.get('mqtt', {}).get('client_id', 'flask_backend_generic')
mqtt_backend = mqtt_client.Client(mqtt_client.CallbackAPIVersion.VERSION2, mqtt_id)
mqtt_backend.username_pw_set(config.get('mqtt', {}).get('user', ''), config.get('mqtt', {}).get('password', ''))
mqtt_backend.on_connect = on_connect
mqtt_backend.on_disconnect = on_disconnect
mqtt_backend.on_message = on_message

def is_connected():
    return mqtt_connected_status

def start_mqtt():
    try:
        broker = config.get('mqtt', {}).get('broker', 'localhost')
        port = config.get('mqtt', {}).get('port', 1883)
        mqtt_backend.connect_async(broker, port)
        mqtt_backend.loop_start()
        logger.info(f"Avvio connessione MQTT asincrona verso {broker}:{port}...")
    except Exception as e:
        logger.error(f"Errore critico nell'inizializzazione MQTT: {e}")

def mqtt_publish(topic, payload, qos=1):
    if not mqtt_connected_status:
        logger.warning(f"MQTT offline: pubblicazione su {topic} annullata")
        return False
    try:
        info = mqtt_backend.publish(topic, payload, qos=qos)
        if info.rc != mqtt_client.MQTT_ERR_SUCCESS:
            logger.warning(f"MQTT publish fallita su {topic} (rc={info.rc})")
            return False
        return True
    except Exception as e:
        logger.error(f"MQTT publish error su {topic}: {e}")
        return False
