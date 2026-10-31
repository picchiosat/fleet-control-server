// --- SISTEMA TRADUZIONI (i18n) & HELPERS ---
const i18n = {
    en: {
        lblLogLimit: "Rows:",
        lastTransits: "Lastheard", loginTitle: "SYSTEM_LOGIN",
        thTime: "Time", thRep: "Repeater", thMode: "Mode", thCall: "Callsign", thDur: "Duration",
        thUser: "User", thRole: "Role", thNodes: "Nodes", thActs: "Actions",
        btnReqCfg: "REQ_CFG", btnGlobal: "GBL_OVR", btnAdmin: "SYS_ADM", btnPass: "CHG_PWD", btnLogout: "LOGOUT",
        btnSvc: "SVC", btnFile: "CFG", btnBoot: "REBOOT", btnAdd: "ADD",
        waitNet: "> Waiting network...", waitData: "Waiting for node data...", forceUpdate: "FORCE_UPD",
        adminTitle: "SYS_ADMIN", adminDBSync: "DB_SYNC_CFG", adminTime: "Daily Update Time:", adminSave: "SAVE_CFG", roleOp: "Operator",
        modSvcTitle: "DAEMONS:", modFileTitle: "CFG_FILES", modEditTitle: "EDIT:",
        warnEdit: "[WARN] DIRECT EDIT ACTIVE",
        btnEdit: "EDIT", btnStart: "START", btnRestart: "RST", btnStop: "STOP", btnSave: "WRITE_FILE",
        btnHat: "RST_HAT", confHat: "PHYSICAL RESET MMDVM ON: ",
        confOp: "Confirm operation on ", confTgOn: "ENABLE Telegram notifications for ", confTgOff: "MUTE Telegram notifications for ", confOvr: "Are you sure you want to overwrite file on ",
        warnDaemon: "[WARN] DAEMON OFFLINE",
        promptOvr: "GLOBAL OVERRIDE", promptOvrConfirm: "Confirm sending to ENTIRE network?",
        modUpdateTitle: "GBL_UPDATE", confUpdate: "Do you want to request updated data and configuration files from all nodes in the fleet?", alertUpdateOk: "ACK",
        btnConfReset: "CONFIRM", btnCancel: "ABORT", promptPass: "NEW PWD:",
        titleError: "ERR", titleSuccess: "OK", titleAction: "CONFIRM", titleDelete: "DEL_USR", titleSave: "SAVE", titleGlobal: "GBL_OVR",
        btnYes: "EXECUTE", msgDelUser: "DELETE USER?", msgPassOk: "PWD_UPDATED", msgPassErr: "PWD_ERR", msgLoginFail: "AUTH_FAIL",
        msgConfigSaved: "CFG_SAVED", msgConfigErr: "CFG_ERR", msgNetErr: "NET_ERR", msgOvrSel: "SELECT_PROF:",
        msgOvrOk: "CMD_BROADCASTED", msgMissUser: "MISSING_USR", msgMissPass: "MISSING_PWD", btnSvcKo: "DAEMON_ERR",
        phNewPass: "NEW_PWD (EMPTY=KEEP)", phPass: "PWD",
        titleSwitch: "SW_PROF", confSwitch: "SWITCH TO ", titleBoot: "SYS_REBOOT", confBoot: "REBOOT NODE ",
        ttReqCfg: "REQ_DATA", ttGlobal: "GBL_OVR", ttAdmin: "ADMIN", ttPass: "CHG_PWD", ttLogout: "LOGOUT",
        ttProfA: "PROF_A", ttProfB: "PROF_B", ttTgOn: "TG_ON", ttTgOff: "TG_OFF", ttSvc: "DAEMONS", ttFile: "FILES", ttHat: "RST_HAT", ttBoot: "REBOOT",
        ttSwitchTo: "SW_TO: ", ttSvcStart: "START", ttSvcRestart: "RST", ttSvcEdit: "EDIT", ttSvcStop: "STOP", ttLang: "LANG",
        statTopTG: "TOP_TG", statTopCall: "TOP_CALL", statLoading: "LOADING...", statAvgDur: "AVG_DUR", statTodayTx: "TX_TODAY", statNoData: "NO_DATA",
        statTitle: "DAILY_STATS", statAllNodes: "ALL_NODES", modVersions: "SW_VERSIONS",
        filtAll: "ALL_NODES", filtOnline: "ONLINE", filtOffline: "OFFLINE", filtAlerts: "ALERTS"
    },
    it: {
        lblLogLimit: "Righe:",
        lastTransits: "Ultimi ascolti", loginTitle: "SYSTEM_LOGIN",
        thTime: "Ora", thRep: "Ripetitore", thMode: "Modo", thCall: "Nominativo", thDur: "Durata",
        thUser: "Utente", thRole: "Ruolo", thNodes: "Nodi", thActs: "Azioni",
        btnReqCfg: "REQ_CFG", btnGlobal: "GBL_OVR", btnAdmin: "SYS_ADM", btnPass: "CHG_PWD", btnLogout: "LOGOUT",
        btnSvc: "SVC", btnFile: "CFG", btnBoot: "REBOOT", btnAdd: "ADD",
        waitNet: "> Attesa rete...", waitData: "In attesa dei dati dal nodo...", forceUpdate: "FORCE_UPD",
        adminTitle: "SYS_ADMIN", adminDBSync: "DB_SYNC_CFG", adminTime: "Orario Aggiornamento:", adminSave: "SAVE_CFG", roleOp: "Operatore",
        modSvcTitle: "DAEMONS:", modFileTitle: "CFG_FILES", modEditTitle: "EDIT:",
        warnEdit: "[WARN] DIRECT EDIT ACTIVE",
        btnEdit: "EDIT", btnStart: "START", btnRestart: "RST", btnStop: "STOP", btnSave: "WRITE_FILE",
        btnHat: "RST_HAT", confHat: "PHYSICAL RESET MMDVM ON: ",
        confOp: "Confermi l'operazione su ", confTgOn: "Vuoi ATTIVARE le notifiche Telegram per il nodo ", confTgOff: "Vuoi SILENZIARE le notifiche Telegram per il nodo ", confOvr: "Sei sicuro di voler sovrascrivere il file su ",
        warnDaemon: "[WARN] DAEMON OFFLINE",
        promptOvr: "GBL_OVR", promptOvrConfirm: "Confermi l'invio a TUTTA la rete?",
        modUpdateTitle: "GBL_UPDATE", confUpdate: "Vuoi richiedere i dati e i file di configurazione aggiornati a tutti i nodi della flotta?", alertUpdateOk: "ACK",
        btnConfReset: "CONFIRM", btnCancel: "ABORT", promptPass: "NEW PWD:",
        titleError: "ERR", titleSuccess: "OK", titleAction: "CONFIRM", titleDelete: "DEL_USR", titleSave: "SAVE", titleGlobal: "GBL_OVR",
        btnYes: "EXECUTE", msgDelUser: "DELETE USER?", msgPassOk: "PWD_UPDATED", msgPassErr: "PWD_ERR", msgLoginFail: "AUTH_FAIL",
        msgConfigSaved: "CFG_SAVED", msgConfigErr: "CFG_ERR", msgNetErr: "NET_ERR", msgOvrSel: "SELECT_PROF:",
        msgOvrOk: "CMD_BROADCASTED", msgMissUser: "MISSING_USR", msgMissPass: "MISSING_PWD", btnSvcKo: "DAEMON_ERR",
        phNewPass: "NEW_PWD (EMPTY=KEEP)", phPass: "PWD",
        titleSwitch: "SW_PROF", confSwitch: "SWITCH TO ", titleBoot: "SYS_REBOOT", confBoot: "REBOOT NODE ",
        ttReqCfg: "REQ_DATA", ttGlobal: "GBL_OVR", ttAdmin: "ADMIN", ttPass: "CHG_PWD", ttLogout: "LOGOUT",
        ttProfA: "Passa al Profilo A", ttProfB: "Passa al Profilo B", ttTgOn: "Abilita notifiche Telegram", ttTgOff: "Disabilita notifiche Telegram", ttSvc: "Gestisci demoni di sistema", ttFile: "Modifica file .ini da remoto", ttHat: "Reset fisico scheda modem", ttBoot: "Riavvia sistema operativo",
        ttSwitchTo: "SW_TO: ", ttSvcStart: "START", ttSvcRestart: "RST", ttSvcEdit: "EDIT", ttSvcStop: "STOP", ttLang: "LANG",
        statTopTG: "TOP_TG", statTopCall: "TOP_CALL", statLoading: "LOADING...", statAvgDur: "AVG_DUR", statTodayTx: "TX_TODAY", statNoData: "NO_DATA",
        statTitle: "DAILY_STATS", statAllNodes: "ALL_NODES", modVersions: "SW_VERSIONS",
        filtAll: "ALL_NODES", filtOnline: "ONLINE", filtOffline: "OFFLINE", filtAlerts: "ALERTS"
    }
};

let currentLang = localStorage.getItem('lang') || 'en'; 
function t(key) { return i18n[currentLang][key] || key; }
function toggleLang() { currentLang = currentLang === 'it' ? 'en' : 'it'; localStorage.setItem('lang', currentLang); location.reload(); }

function applyTranslations() {
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.innerText = currentLang === 'it' ? "ENG" : "ITA";
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[currentLang][key]) el.innerHTML = i18n[currentLang][key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (i18n[currentLang][key]) el.title = i18n[currentLang][key];
    });
    const newPassInput = document.getElementById('new-pass');
    if (newPassInput && editingUserId) newPassInput.placeholder = t('phNewPass');
    else if (newPassInput) newPassInput.placeholder = t('phPass');
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function q(s) { return esc(JSON.stringify(String(s ?? ''))); }

// --- DIALOGHI ALERT & CONFIRM ---
function customAlert(title, desc, isError = false) {
    const color = isError ? 'var(--danger)' : 'var(--success)';
    document.getElementById('alert-title').innerHTML = '> ' + title;
    document.getElementById('alert-title').style.color = color;
    document.getElementById('alert-box').style.borderTopColor = color;
    document.getElementById('alert-desc').innerHTML = desc;
    document.getElementById('alert-modal').style.display = 'flex';
}

function customConfirm(title, desc, color, callback) {
    document.getElementById('confirm-title').innerHTML = '> ' + title;
    document.getElementById('confirm-title').style.color = color;
    document.getElementById('confirm-box').style.borderTopColor = color;
    document.getElementById('confirm-desc').innerHTML = desc;
    document.getElementById('confirm-yes-btn').style.borderColor = color;
    document.getElementById('confirm-yes-btn').style.color = color;
    document.getElementById('confirm-yes-btn').innerText = t('btnYes');
    document.getElementById('confirm-cancel-btn').innerText = t('btnCancel');
    confirmActionCallback = callback;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function executeConfirmAction() {
    document.getElementById('confirm-modal').style.display = 'none';
    if (confirmActionCallback) { confirmActionCallback(); confirmActionCallback = null; }
}

// --- MODALE LOGIN ---
function openLoginModal() { document.getElementById('login-modal').style.display = 'flex'; setTimeout(() => document.getElementById('modal-username').focus(), 100); }
function closeLoginModal() { document.getElementById('login-modal').style.display = 'none'; document.getElementById('modal-username').value = ''; document.getElementById('modal-password').value = ''; }
function handleLoginEnter(e) { if (e.key === 'Enter') performLogin(); }

// --- MODALE RESET HAT ---
function confirmHatReset(id) { 
    currentResetHatId = id;
    document.getElementById('reset-hat-desc').innerText = `${t('confHat')}${id.toUpperCase()}?`;
    document.getElementById('reset-hat-modal').style.display = 'flex';
}
function closeHatResetModal() { document.getElementById('reset-hat-modal').style.display = 'none'; currentResetHatId = null; }

async function executeHatReset() {
    if (!currentResetHatId) return;
    const clientId = currentResetHatId; closeHatResetModal(); 
    try {
        const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientId, type: 'RESET_HAT' }) });
        const data = await res.json();
        if(!data.success) { customAlert(t('titleError'), esc(data.error), true); }
        refreshStates();
    } catch (e) { console.error(e); }
}

// --- MODALE GLOBAL UPDATE ---
function sendGlobalUpdate() { document.getElementById('update-modal').style.display = 'flex'; }
function closeUpdateModal() { document.getElementById('update-modal').style.display = 'none'; }

async function executeUpdateRequest() {
    closeUpdateModal();
    try { await fetch('/api/update_nodes', { method: 'POST' }); customAlert(t('titleSuccess'), t('alertUpdateOk')); } 
    catch (e) { console.error(e); }
}

// --- MODALE ADMIN & UTENTI ---
async function openAdmin() { document.getElementById('admin-modal').style.display = 'flex'; loadUsers(); loadSettings(); cancelEdit(); }
function closeAdmin() { document.getElementById('admin-modal').style.display = 'none'; cancelEdit(); }

async function loadUsers() {
    const res = await fetch('/api/users'); if (!res.ok) return; const users = await res.json(); usersCache = {}; users.forEach(u => { usersCache[u.id] = u; });
    document.getElementById('users-table-body').innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td><td style="font-weight:bold;">${esc(u.username)}</td><td>[ ${esc(String(u.role).toUpperCase())} ]</td><td>${esc(u.allowed_nodes)}</td>
            <td style="text-align:right; min-width: 130px; white-space: nowrap;">
                <button onclick="startEditUser(${Number(u.id)})" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important; display:inline-block; width: 60px; flex: 0 0 60px; margin-right:5px; padding: 6px;">EDIT</button>
                <button onclick="deleteUser(${u.id})" class="btn-cmd" style="border-color:var(--danger); color:var(--danger) !important; display:inline-block; width: 60px; flex: 0 0 60px; padding: 6px;">DEL</button>
            </td>
        </tr>`).join('');
}

function startEditUser(id) {
    const u = usersCache[id]; if (!u) return;
    editingUserId = id; document.getElementById('new-user').value = u.username; document.getElementById('new-user').disabled = true; document.getElementById('new-pass').value = ""; document.getElementById('new-pass').placeholder = t('phNewPass'); document.getElementById('new-role').value = u.role; document.getElementById('new-nodes').value = u.allowed_nodes;
    const btnSubmit = document.getElementById('btn-user-submit'); btnSubmit.innerHTML = "UPDATE"; btnSubmit.style.borderColor = "var(--accent)"; btnSubmit.style.color = "var(--accent) !important"; document.getElementById('btn-user-cancel').style.display = "block";
}

function cancelEdit() {
    editingUserId = null; document.getElementById('new-user').value = ""; document.getElementById('new-user').disabled = false; document.getElementById('new-pass').value = ""; document.getElementById('new-pass').placeholder = t('phPass'); document.getElementById('new-role').value = "operator"; document.getElementById('new-nodes').value = "";
    const btnSubmit = document.getElementById('btn-user-submit'); btnSubmit.innerHTML = "ADD"; btnSubmit.style.borderColor = "var(--success)"; btnSubmit.style.color = "var(--success) !important"; document.getElementById('btn-user-cancel').style.display = "none";
}

async function submitUser() {
    const username = document.getElementById('new-user').value; const password = document.getElementById('new-pass').value; const role = document.getElementById('new-role').value; let allowed = document.getElementById('new-nodes').value;
    if (!username) return customAlert(t('titleError'), t('msgMissUser'), true);
    const payload = { username, role, allowed_nodes: allowed || 'all' }; if (password) payload.password = password;
    if (editingUserId) {
        const res = await fetch(`/api/users/${editingUserId}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); const data = await res.json(); 
        if (data.success) { cancelEdit(); loadUsers(); } else customAlert(t('titleError'), esc(data.error), true);
    } else {
        if (!password) return customAlert(t('titleError'), t('msgMissPass'), true);
        const res = await fetch('/api/users', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); const data = await res.json(); 
        if (data.success) { cancelEdit(); loadUsers(); } else customAlert(t('titleError'), esc(data.error), true);
    }
}

function deleteUser(id) { customConfirm(t('titleDelete'), t('msgDelUser'), "var(--danger)", async () => { const r = await fetch(`/api/users/${id}`, {method: 'DELETE'}); const dd = await r.json().catch(() => ({})); if (!dd.success) customAlert(t('titleError'), esc(dd.error || 'Error'), true); loadUsers(); cancelEdit(); }); }

// --- CONFIGURAZIONE SYNC / DB ---
async function loadSettings() { try { const res = await fetch('/api/config'); if (!res.ok) return; const data = await res.json(); document.getElementById('update-time-input').value = data.update_schedule; document.getElementById('url-dmr-input').value = data.url_dmr; document.getElementById('url-nxdn-input').value = data.url_nxdn; } catch (e) { console.error(e); } }
async function saveSettings() { 
    const payload = { update_schedule: document.getElementById('update-time-input').value, url_dmr: document.getElementById('url-dmr-input').value, url_nxdn: document.getElementById('url-nxdn-input').value }; 
    try { const res = await fetch('/api/config', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); const data = await res.json(); 
        if (data.success) customAlert(t('titleSuccess'), t('msgConfigSaved')); else customAlert(t('titleError'), esc(data.error || t('msgConfigErr')), true); 
    } catch (e) { console.error(e); } 
}

// --- GLOBAL OVERRIDE ---
function triggerGlobalEmergency() {
    let uniqueProfiles = {};
    for (const id in globalHealthData) { 
        if (globalHealthData[id] && globalHealthData[id].profiles) { 
            for (const [k, v] of Object.entries(globalHealthData[id].profiles)) { uniqueProfiles[k] = v; }
        } 
    }
    const container = document.getElementById('global-btn-container'); let html = ''; const colors = ["var(--accent)", "#00ffcc", "var(--primary)"]; let idx = 0;
    for (const [k, v] of Object.entries(uniqueProfiles)) {
        let col = colors[idx % colors.length];
        html += `<button onclick="sendGlobalAction(${q(k)})" class="btn-cmd" style="border-color:${col}; color:${col} !important;">${esc(v)}</button>`;
        idx++;
    }
    if (Object.keys(uniqueProfiles).length === 0) { html = `<p style="color:var(--danger); font-weight:400; font-family:'JetBrains Mono',monospace;">NO_PROFS_FOUND</p>`; }
    container.innerHTML = html; document.getElementById('override-desc').innerText = t('msgOvrSel'); document.getElementById('override-modal').style.display = 'flex';
}

function sendGlobalAction(action) {
    document.getElementById('override-modal').style.display = 'none';
    customConfirm(t('titleGlobal'), t('promptOvrConfirm'), "var(--danger)", async () => {
        try { const res = await fetch('/api/global_command', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type: action}) }); const d = await res.json(); 
            if(d.success) customAlert(t('titleSuccess'), t('msgOvrOk')); else customAlert(t('titleError'), esc(d.error), true); refreshStates();
        } catch(e) { console.error(e); }
    });
}

// --- CAMBIO PASSWORD ---
function changeMyPassword() { document.getElementById('new-password-input').value = ''; document.getElementById('password-modal').style.display = 'flex'; setTimeout(() => document.getElementById('new-password-input').focus(), 100); }
function closePasswordModal() { document.getElementById('password-modal').style.display = 'none'; }
async function executePasswordChange() {
    const p = document.getElementById('new-password-input').value; if (!p) return; closePasswordModal();
    try { const res = await fetch('/api/change_password', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: me.user, new_password: p}) }); 
        if ((await res.json()).success) { customAlert(t('titleSuccess'), t('msgPassOk')); setTimeout(() => logout(), 1500); } else { customAlert(t('titleError'), t('msgPassErr'), true); }
    } catch(e) { console.error(e); }
}

// --- MODALE FILE CONFIGURAZIONE ---
function fileLabel(stem, names) {
    const key = String(stem).toLowerCase(); const full = (names || []).find(n => String(n).replace(/\.[^.]*$/, '').toLowerCase() === key);
    if (full) { const m = String(full).match(/^(.*?)(\.[^.]*)?$/); return String(m[1]).toUpperCase() + (m[2] || ''); }
    return String(stem).toUpperCase() + '.INI';
}

function openConfigsModal(clientId) {
    const data = globalHealthData[clientId.toLowerCase()]; 
    const listDiv = document.getElementById('configs-list'); 
    let listaFile = data ? (data.config_files || data.files || []) : []; 
    const fileNames = (data && data.file_names) || [];
    
    if (listaFile.length === 0) {
        listDiv.innerHTML = `<p>${t('waitData')}</p><button onclick="sendGlobalUpdate(); closeConfigsModal();" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important;">${t('forceUpdate')}</button>`;
    } else {
        listDiv.innerHTML = listaFile.map(f => `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed var(--border-light); width:100%;">
            <span style="font-weight:400; font-family:'JetBrains Mono',monospace; flex: 1; text-align: left; overflow:hidden; text-overflow:ellipsis; padding-right:20px;">${esc(fileLabel(f, fileNames))}</span>
            <button onclick="closeConfigsModal(); openEditorModal(${q(clientId)}, ${q(f)})" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important; width: 100px; flex: 0 0 100px; padding: 8px;">${t('btnEdit')}</button>
        </div>`).join('');
    }
    document.getElementById('configs-modal').style.display = 'flex';
}
function closeConfigsModal() { document.getElementById('configs-modal').style.display = 'none'; }

// --- MODALE GESTIONE DEMONI/SERVIZI ---
function openServicesModal(clientId) { 
    document.getElementById('svc-modal-title').innerText = clientId.toUpperCase(); 
    document.getElementById('services-modal').style.display = 'flex'; 
    renderServicesList(clientId); 
}
function closeServicesModal() { document.getElementById('services-modal').style.display = 'none'; }

function renderServicesList(clientId) {
    const data = globalHealthData[clientId.toLowerCase()]; 
    const listDiv = document.getElementById('services-list');
    
    if (!data || !data.processes || Object.keys(data.processes).length === 0) { listDiv.innerHTML = "<p>NO_DATA</p>"; return; }
    let html = "";
    for (const [name, status] of Object.entries(data.processes)) {
        const isOnline = status.toLowerCase() === 'online'; const statusColor = isOnline ? 'var(--success)' : 'var(--danger)'; 
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px dashed var(--border-light); width: 100%;">
                    <div style="font-weight:400; color:${statusColor}; font-family:'JetBrains Mono',monospace; flex: 1; text-align: left; overflow:hidden; text-overflow:ellipsis; padding-right:20px;">${esc(name)} [${esc(String(status).toUpperCase())}]</div>
                    <div style="display:flex; gap:8px; flex: 0 0 auto; justify-content: flex-end;">
                        ${!isOnline ? `<button onclick="controlService(${q(clientId)},${q(name)}, 'start')" class="btn-cmd" style="border-color:var(--success); color:var(--success) !important; width: 70px; flex: 0 0 70px; padding: 6px 0;">START</button>` : ''}
                        <button onclick="controlService(${q(clientId)}, ${q(name)}, 'restart')" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important; width: 70px; flex: 0 0 70px; padding: 6px 0;">RST</button>
                        <button onclick="openEditorModal(${q(clientId)}, ${q(name)})" class="btn-cmd" style="width: 70px; flex: 0 0 70px; padding: 6px 0;">EDIT</button>
                        ${isOnline ? `<button onclick="controlService(${q(clientId)},${q(name)}, 'stop')" class="btn-cmd" style="border-color:var(--danger); color:var(--danger) !important; width: 70px; flex: 0 0 70px; padding: 6px 0;">STOP</button>` : ''}
                    </div>
                </div>`;
    }
    listDiv.innerHTML = html;
}

function controlService(clientId, service, action) { 
    customConfirm(t('titleAction'), `${t('confOp')}<b>${esc(service)}</b>?`, "var(--accent)", async () => {
        try { const res = await fetch('/api/service_control', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ clientId, service, action }) }); const data = await res.json(); 
            if(!data.success) customAlert(t('titleError'), "ERR: " + esc(data.error), true); 
        } catch(e) { console.error(e); } 
    });
}

// --- MODALE EDITOR INI ---
let currentEditClient = ""; let currentEditService = "";
async function openEditorModal(clientId, service) {
    currentEditClient = clientId; currentEditService = service; document.getElementById('editor-title').innerText = `${service.toUpperCase()} @ ${clientId.toUpperCase()}`;
    document.getElementById('config-textarea').value = "AWAITING_STREAM..."; document.getElementById('editor-status').innerText = ""; document.getElementById('editor-modal').style.display = 'flex';
    try { 
        const res = await fetch(`/api/config_file/${encodeURIComponent(clientId)}/${encodeURIComponent(service)}`); 
        const data = await res.json(); 
        if (data.success) {
            document.getElementById('config-textarea').value = data.data.raw_text || "EMPTY"; 
        } else {
            document.getElementById('config-textarea').value = "ERR:\n" + data.error; 
        }
    } catch(e) { 
        document.getElementById('config-textarea').value = "NET_ERR"; 
    }
}
function closeEditorModal() { document.getElementById('editor-modal').style.display = 'none'; }

function saveConfig() {
    const textValue = document.getElementById('config-textarea').value; const statusSpan = document.getElementById('editor-status');
    customConfirm(t('titleSave'), `${t('confOvr')}<b>${currentEditClient.toUpperCase()}</b>?`, "var(--danger)", async () => {
        statusSpan.innerText = "WRITING..."; statusSpan.style.color = "var(--success)";
        try {
            const res = await fetch('/api/config_file', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ clientId: currentEditClient, service: currentEditService, config_data: { "raw_text": textValue } }) });
            const data = await res.json();
            if (data.success) { customAlert(t('titleSuccess'), "FILE_WRITTEN"); closeEditorModal(); } else { customAlert(t('titleError'), "ERR: " + esc(data.error), true); statusSpan.innerText = "ERR"; }
        } catch(e) { customAlert(t('titleError'), t('msgNetErr'), true); statusSpan.innerText = "NET_ERR"; }
    });
}

// --- MODALE VERSIONI SOFTWARE ---
function openVersionsModal(clientId) {
    const versions = globalVersionsData[clientId.toLowerCase()]; const listDiv = document.getElementById('versions-list');
    if (!versions || Object.keys(versions).length === 0) { listDiv.innerHTML = "<p style='font-family:\"JetBrains Mono\",monospace;'>NO_DATA. RESTART SVCS TO PUSH LOGS.</p>"; } 
    else { let html = ""; for (const [software, version] of Object.entries(versions)) { html += `<div style="border-bottom:1px dashed var(--border-light); padding:5px 0;"><strong style="color: var(--primary); display: inline-block; width: 140px;">${esc(software)}:</strong> <span style="color: var(--success); font-weight: 400;">${esc(version)}</span></div>`; } listDiv.innerHTML = html; }
    document.getElementById('versions-modal').style.display = 'flex';
}
function closeVersionsModal() { document.getElementById('versions-modal').style.display = 'none'; }
