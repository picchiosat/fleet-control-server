"""Controllo permessi sui nodi, condiviso da API, push e WebSocket (nessuna dipendenza interna)."""


def node_allowed(role, allowed_nodes, cid):
    if role == 'admin':
        return True
    allowed = (allowed_nodes or '').strip().lower()
    if allowed == 'all':
        return True
    return cid in [x.strip().lower() for x in allowed.split(',') if x.strip()]
