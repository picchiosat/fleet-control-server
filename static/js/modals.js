// --- SISTEMA TRADUZIONI (i18n) & HELPERS ---
const i18n = {
    en: {
        lblLogLimit: "Rows:",
        lastTransits: "Lastheard", loginTitle: "🔒 System Login",
        thTime: "Time", thRep: "Repeater", thMode: "Mode", thCall: "Callsign", thDur: "Duration",
        thUser: "User", thRole: "Role", thNodes: "Nodes", thActs: "Actions",
        btnReqCfg: "🔄 REQ CONFIG", btnGlobal: "🚨 GLOBAL OVERRIDE", btnAdmin: "🛠️ ADMIN", btnPass: "🔑 PASS", btnLogout: "LOGOUT",
        btnSvc: "⚙️ SVC", btnFile: "📂 FILE", btnBoot: "🔄 BOOT", btnAdd: "+ ADD",
        waitNet: "> Waiting network...", waitData: "Waiting for node data...", forceUpdate: "🔄 FORCE UPDATE",
        adminTitle: "🛠️ User & System Management", adminDBSync: "⚙️ Database Sync Config", adminTime: "Daily Update Time:", adminSave: "SAVE CONFIG", roleOp: "Operator",
        modSvcTitle: "⚙️ System Daemons:", modFileTitle: "📂 Config Files", modEditTitle: "📝 INI Editor:",
        warnEdit: "⚠️ WARNING: This editor directly manipulates remote node parameters.",
        btnEdit: "📝 EDIT", btnStart: "▶ START", btnRestart: "🔄 RESTART", btnStop: "🛑 STOP", btnSave: "💾 SAVE & SEND",
        btnHat: "🔌 RESET HAT", confHat: "Are you sure you want to physically reset the MMDVM board on node ",
        confOp: "Confirm operation on ", confTgOn: "ENABLE Telegram notifications for ", confTgOff: "MUTE Telegram notifications for ", confOvr: "Are you sure you want to overwrite file on ",
        warnDaemon: "⚠️ SVC KO - CHECK DAEMONS ⚠️",
        promptOvr: "GLOBAL OVERRIDE", promptOvrConfirm: "Confirm sending to ENTIRE network?",
        modUpdateTitle: "🔄 GLOBAL UPDATE", confUpdate: "Do you want to request updated data and configuration files from all nodes in the fleet?", alertUpdateOk: "Request sent successfully!",
        btnConfReset: "⚠️ CONFIRM RESET", btnCancel: "CANCEL", promptPass: "Enter the new password:",
        titleError: "❌ ERROR", titleSuccess: "✅ SUCCESS", titleAction: "⚙️ CONFIRM ACTION", titleDelete: "🗑️ DELETE USER", titleSave: "💾 SAVE", titleGlobal: "🚨 GLOBAL OVERRIDE",
        btnYes: "YES, PROCEED", msgDelUser: "Confirm user deletion?", msgPassOk: "Password updated successfully!", msgPassErr: "Failed to update password.", msgLoginFail: "Login Failed",
        msgConfigSaved: "Configuration saved!", msgConfigErr: "Error saving configuration", msgNetErr: "Network Error", msgOvrSel: "Select the profile to send to the ENTIRE network:",
        msgOvrOk: "Command successfully sent to the network!", msgMissUser: "Missing Username", msgMissPass: "Password required for new user", btnSvcKo: "⚠️ DAEMON KO",
        phNewPass: "New pass (empty to keep)", phPass: "Password",
        titleSwitch: "SWITCH PROFILE", confSwitch: "Are you sure you want to switch to", titleBoot: "SYSTEM REBOOT", confBoot: "Are you sure you want to REBOOT node ",
        ttReqCfg: "Request immediate data update", ttGlobal: "Force profile switch on network", ttAdmin: "User and system management", ttPass: "Change your password", ttLogout: "Log out",
        ttProfA: "Switch to Profile A", ttProfB: "Switch to Profile B", ttTgOn: "Enable Telegram notifications", ttTgOff: "Disable Telegram notifications", ttSvc: "Manage system daemons", ttFile: "Edit .ini configuration files", ttHat: "Send physical reset to modem", ttBoot: "Reboot node operating system",
        ttSwitchTo: "Switch to profile: ", ttSvcStart: "Start service", ttSvcRestart: "Restart service", ttSvcEdit: "Edit configuration", ttSvcStop: "Stop service", ttLang: "Change language",
        statTopTG: "🎯 TOP TALKGROUPS", statTopCall: "🗣️ TOP CALLSIGNS", statLoading: "Loading...", statAvgDur: "⏱️ AVERAGE DURATION", statTodayTx: "📡 TRANSITS TODAY", statNoData: "No data",
        statTitle: "DAILY STATISTICS", statAllNodes: "ALL NODES", modVersions: "Software & Firmware",
        filtAll: "All Nodes", filtOnline: "Online", filtOffline: "Offline", filtAlerts: "⚠️ Alerts"
    },
    it: {
        lblLogLimit: "Righe:",
        lastTransits: "Ultimi ascolti", loginTitle: "🔒 Login di Sistema",
        thTime: "Ora", thRep: "Ripetitore", thMode: "Modo", thCall: "Nominativo", thDur: "Durata",
        thUser: "Utente", thRole: "Ruolo", thNodes: "Nodi", thActs: "Azioni",
        btnReqCfg: "🔄 RICHIEDI CONFIG", btnGlobal: "🚨 OVERRIDE GLOBALE", btnAdmin: "🛠️ ADMIN", btnPass: "🔑 PASS", btnLogout: "LOGOUT",
        btnSvc: "⚙️ SVC", btnFile: "📂 FILE", btnBoot: "🔄 BOOT", btnAdd: "+ AGGIUNGI",
        waitNet: "> Attesa rete...", waitData: "In attesa dei dati dal nodo...", forceUpdate: "🔄 FORZA AGGIORNAMENTO",
        adminTitle: "🛠️ Gestione Utenti e Sistema", adminDBSync: "⚙️ Sincronizzazione Database", adminTime: "Orario Aggiornamento:", adminSave: "SALVA CONFIG", roleOp: "Operatore",
        modSvcTitle: "⚙️ Demoni Sistema:", modFileTitle: "📂 File di Configurazione", modEditTitle: "📝 Editor INI:",
        warnEdit: "⚠️ ATTENZIONE: Questo editor manipola direttamente i parametri del nodo remoto.",
        btnEdit: "📝 MODIFICA", btnStart: "▶ START", btnRestart: "🔄 RESTART", btnStop: "🛑 STOP", btnSave: "💾 SALVA ED INVIA",
        btnHat: "🔌 RESET HAT", confHat: "Sei sicuro di voler resettare fisicamente la scheda MMDVM sul nodo ",
        confOp: "Confermi l'operazione su ", confTgOn: "Vuoi ATTIVARE le notifiche Telegram per il nodo ", confTgOff: "Vuoi SILENZIARE le notifiche Telegram per il nodo ", confOvr: "Sei sicuro di voler sovrascrivere il file su ",
        warnDaemon: "⚠️ SVC KO - CONTROLLA DEMONI ⚠️",
        promptOvr: "OVERRIDE GLOBALE", promptOvrConfirm: "Confermi l'invio a TUTTA la rete?",
        modUpdateTitle: "🔄 AGGIORNAMENTO GLOBALE", confUpdate: "Vuoi richiedere i dati e i file di configurazione aggiornati a tutti i nodi della flotta?", alertUpdateOk: "Richiesta inviata con successo!",
        btnConfReset: "⚠️ CONFERMA RESET", btnCancel: "ANNULLA", promptPass: "Inserisci la nuova password:",
        titleError: "❌ ERRORE", titleSuccess: "✅ OK", titleAction: "⚙️ CONFERMA AZIONE", titleDelete: "🗑️ ELIMINA UTENTE", titleSave: "💾 SALVATAGGIO", titleGlobal: "🚨 OVERRIDE GLOBALE",
        btnYes: "SI, PROCEDI", msgDelUser: "Confermi l'eliminazione dell'utente?", msgPassOk: "Password aggiornata con successo!", msgPassErr: "Errore durante l'aggiornamento della password.", msgLoginFail: "Login Fallito",
        msgConfigSaved: "Configurazione salvata!", msgConfigErr: "Errore durante il salvataggio", msgNetErr: "Errore di rete", msgOvrSel: "Seleziona il profilo da inviare a TUTTA la rete:",
        msgOvrOk: "Comando inviato con successo a tutta la rete!", msgMissUser: "Username mancante", msgMissPass: "Password obbligatoria per il nuovo utente", btnSvcKo: "⚠️ DEMONE KO",
        phNewPass: "Nuova pass (vuota per non cambiare)", phPass: "Password",
        titleSwitch: "CAMBIO PROFILO", confSwitch: "Sei sicuro di voler passare al", titleBoot: "RIAVVIO SISTEMA", confBoot: "Sei sicuro di voler RIAVVIARE il nodo ",
        ttReqCfg: "Richiedi aggiornamento dati", ttGlobal: "Forza cambio profilo globale", ttAdmin: "Gestione utenti e sistema", ttPass: "Cambia la tua password", ttLogout: "Disconnetti",
        ttProfA: "Passa al Profilo A", ttProfB: "Passa al Profilo B", ttTgOn: "Abilita notifiche Telegram", ttTgOff: "Disabilita notifiche Telegram", ttSvc: "Gestisci demoni di sistema", ttFile: "Modifica file .ini da remoto", ttHat: "Reset fisico scheda modem", ttBoot: "Riavvia sistema operativo",
        ttSwitchTo: "Passa al profilo: ", ttSvcStart: "Avvia servizio", ttSvcRestart: "Riavvia servizio", ttSvcEdit: "Modifica configurazione", ttSvcStop: "Ferma servizio", ttLang: "Cambia lingua",
        statTopTG: "🎯 TOP TALKGROUPS", statTopCall: "🗣️ TOP CALLSIGNS", statLoading: "Caricamento...", statAvgDur: "⏱️ DURATA MEDIA", statTodayTx: "📡 TRANSITI OGGI", statNoData: "Nessun dato",
        statTitle: "STATISTICHE GIORNALIERE", statAllNodes: "TUTTA LA RETE", modVersions: "Software & Firmware",
        filtAll: "Tutti i nodi", filtOnline: "Attivi", filtOffline: "Offline", filtAlerts: "⚠️ Allarmi"
    }
};

let currentLang = localStorage.getItem('lang') || 'en'; 
function t(key) { return i18n[currentLang][key] || key; }
function toggleLang() { currentLang = currentLang === 'it' ? 'en' : 'it'; localStorage.setItem('lang', currentLang); location.reload(); }

function applyTranslations() {
    const langBtn = document.getElementById('lang-btn');
    if (langBtn) langBtn.innerText = currentLang === 'it' ? "🇬🇧 ENG" : "🇮🇹 ITA";
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
    document.getElementById('alert-title').innerHTML = title;
    document.getElementById('alert-title').style.color = color;
    document.getElementById('alert-box').style.borderColor = color;
    document.getElementById('alert-desc').innerHTML = desc;
    document.getElementById('alert-modal').style.display = 'flex';
}

function customConfirm(title, desc, color, callback) {
    document.getElementById('confirm-title').innerHTML = title;
    document.getElementById('confirm-title').style.color = color;
    document.getElementById('confirm-box').style.borderColor = color;
    document.getElementById('confirm-desc').innerHTML = desc;
    document.getElementById('confirm-yes-btn').style.background = color;
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
            <td>${u.id}</td><td style="font-weight:bold;">${esc(u.username)}</td><td><span style="background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:6px; font-size:0.8rem;">${esc(String(u.role).toUpperCase())}</span></td><td>${esc(u.allowed_nodes)}</td>
            <td style="text-align:center;">
                <button onclick="startEditUser(${Number(u.id)})" class="btn-cmd" style="background:var(--accent); padding:6px; width:auto; display:inline-block; margin-right:5px; border:none; color:white !important;">✏️</button>
                <button onclick="deleteUser(${u.id})" class="btn-cmd" style="background:var(--danger); padding:6px; width:auto; display:inline-block; border:none; color:white !important;">🗑️</button>
            </td>
        </tr>`).join('');
}

function startEditUser(id) {
    const u = usersCache[id]; if (!u) return;
    editingUserId = id; document.getElementById('new-user').value = u.username; document.getElementById('new-user').disabled = true; document.getElementById('new-pass').value = ""; document.getElementById('new-pass').placeholder = t('phNewPass'); document.getElementById('new-role').value = u.role; document.getElementById('new-nodes').value = u.allowed_nodes;
    const btnSubmit = document.getElementById('btn-user-submit'); btnSubmit.innerHTML = t('titleSave'); btnSubmit.style.background = "var(--accent)"; document.getElementById('btn-user-cancel').style.display = "block";
}

function cancelEdit() {
    editingUserId = null; document.getElementById('new-user').value = ""; document.getElementById('new-user').disabled = false; document.getElementById('new-pass').value = ""; document.getElementById('new-pass').placeholder = t('phPass'); document.getElementById('new-role').value = "operator"; document.getElementById('new-nodes').value = "";
    const btnSubmit = document.getElementById('btn-user-submit'); btnSubmit.innerHTML = t('btnAdd'); btnSubmit.style.background = "var(--success)"; document.getElementById('btn-user-cancel').style.display = "none";
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
    const container = document.getElementById('global-btn-container'); let html = ''; const colors = ["var(--accent)", "#eab308", "var(--success)", "var(--primary)"]; let idx = 0;
    for (const [k, v] of Object.entries(uniqueProfiles)) {
        let col = colors[idx % colors.length];
        html += `<button onclick="sendGlobalAction(${q(k)})" class="btn-cmd" style="background:${col}; padding:15px; font-size:1.1rem; font-weight:bold; border:none; color:white !important;">${esc(v)}</button>`;
        idx++;
    }
    if (Object.keys(uniqueProfiles).length === 0) { html = `<p style="color:var(--danger); font-weight:bold;">No profiles configured on the network.</p>`; }
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
    return String(stem).toUpperCase() + '.ini';
}

function openConfigsModal(clientId) {
    const data = globalHealthData[clientId.toLowerCase()]; const listDiv = document.getElementById('configs-list'); let listaFile = data ? (data.config_files || data.files || []) : []; const fileNames = (data && data.file_names) || [];
    if (listaFile.length === 0) listDiv.innerHTML = `<div style="text-align:center; padding:20px;"><p style="color:var(--text-muted); margin-bottom:15px;">${t('waitData')}</p><button onclick="sendGlobalUpdate(); closeConfigsModal();" class="btn-cmd" style="background:var(--accent);">${t('forceUpdate')}</button></div>`;
    else listDiv.innerHTML = listaFile.map(f => `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid var(--border-color); margin-bottom:8px;"><span style="font-family:'JetBrains Mono',monospace; font-weight:bold;">${esc(fileLabel(f, fileNames))}</span><button onclick="closeConfigsModal(); openEditorModal(${q(clientId)}, ${q(f)})" class="btn-cmd" style="background:#8e44ad; max-width:120px; border:none; color:white !important;">${t('btnEdit')}</button></div>`).join('');
    document.getElementById('configs-modal').style.display = 'flex';
}
function closeConfigsModal() { document.getElementById('configs-modal').style.display = 'none'; }

// --- MODALE GESTIONE DEMONI/SERVIZI ---
function openServicesModal(clientId) { document.getElementById('svc-modal-title').innerText = clientId.toUpperCase(); document.getElementById('services-modal').style.display = 'flex'; renderServicesList(clientId); }
function closeServicesModal() { document.getElementById('services-modal').style.display = 'none'; }

function renderServicesList(clientId) {
    const data = globalHealthData[clientId.toLowerCase()]; const listDiv = document.getElementById('services-list');
    if (!data || !data.processes || Object.keys(data.processes).length === 0) { listDiv.innerHTML = "<p style='text-align:center; color:var(--text-muted);'>No service data available.</p>"; return; }
    let html = "";
    for (const [name, status] of Object.entries(data.processes)) {
        const isOnline = status.toLowerCase() === 'online'; const statusColor = isOnline ? 'var(--success)' : 'var(--danger)'; 
        html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid var(--border-color); background:rgba(255,255,255,0.02); border-radius:12px; margin-bottom:8px; border-left: 5px solid ${statusColor};">
                    <div><strong style="font-size:1.1rem; display:block; font-family:'JetBrains Mono',monospace;">${esc(name)}</strong><span class="${isOnline?'':'blink'}" style="color:${statusColor}; font-size:0.8rem; font-weight:800;">${esc(String(status).toUpperCase())}</span></div>
                    <div style="display:flex; gap:8px;">
                        ${!isOnline ? `<button onclick="controlService(${q(clientId)},${q(name)}, 'start')" class="btn-cmd" style="background:var(--success); border:none; color:white !important;">▶</button>` : ''}
                        <button onclick="controlService(${q(clientId)}, ${q(name)}, 'restart')" class="btn-cmd" style="background:#f59e0b; border:none; color:white !important;">🔄</button>
                        <button onclick="openEditorModal(${q(clientId)}, ${q(name)})" class="btn-cmd" style="background:#8e44ad; border:none; color:white !important;">📝</button>
                        ${isOnline ? `<button onclick="controlService(${q(clientId)},${q(name)}, 'stop')" class="btn-cmd" style="background:var(--danger); border:none; color:white !important;">🛑</button>` : ''}
                    </div>
                </div>`;
    }
    listDiv.innerHTML = html;
}

function controlService(clientId, service, action) { 
    customConfirm(t('titleAction'), `${t('confOp')}<b>${esc(service)}</b>?`, "var(--accent)", async () => {
        try { const res = await fetch('/api/service_control', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ clientId, service, action }) }); const data = await res.json(); 
            if(!data.success) customAlert(t('titleError'), "Error: " + esc(data.error), true); 
        } catch(e) { console.error(e); } 
    });
}

// --- MODALE EDITOR INI ---
let currentEditClient = ""; let currentEditService = "";
async function openEditorModal(clientId, service) {
    currentEditClient = clientId; currentEditService = service; document.getElementById('editor-title').innerText = `${service.toUpperCase()} @ ${clientId.toUpperCase()}`;
    document.getElementById('config-textarea').value = "Connecting to server..."; document.getElementById('editor-status').innerText = ""; document.getElementById('editor-modal').style.display = 'flex';
    try { const res = await fetch(`/api/config_file/${encodeURIComponent(clientId)}/${encodeURIComponent(service)}`); const data = await res.json(); if (data.success) document.getElementById('config-textarea').value = data.data.raw_text || "Empty file"; else document.getElementById('config-textarea').value = "ERROR:\n" + data.error; } catch(e) { document.getElementById('config-textarea').value = "Connection error."; }
}
function closeEditorModal() { document.getElementById('editor-modal').style.display = 'none'; }

function saveConfig() {
    const textValue = document.getElementById('config-textarea').value; const statusSpan = document.getElementById('editor-status');
    customConfirm(t('titleSave'), `${t('confOvr')}<b>${currentEditClient.toUpperCase()}</b>?`, "var(--danger)", async () => {
        statusSpan.innerText = "Sending..."; statusSpan.style.color = "var(--success)";
        try {
            const res = await fetch('/api/config_file', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ clientId: currentEditClient, service: currentEditService, config_data: { "raw_text": textValue } }) });
            const data = await res.json();
            if (data.success) { customAlert(t('titleSuccess'), "File updated!"); closeEditorModal(); } else { customAlert(t('titleError'), "Server error: " + esc(data.error), true); statusSpan.innerText = "❌ Error"; }
        } catch(e) { customAlert(t('titleError'), t('msgNetErr'), true); statusSpan.innerText = "❌ Network Error"; }
    });
}

// --- MODALE VERSIONI SOFTWARE ---
function openVersionsModal(clientId) {
    const versions = globalVersionsData[clientId.toLowerCase()]; const listDiv = document.getElementById('versions-list');
    if (!versions || Object.keys(versions).length === 0) { listDiv.innerHTML = "<span style='color: var(--text-muted);'>Nessun dato ancora ricevuto. Usa il tasto 🔄 RESTART sui servizi del nodo per forzare l'invio del log di avvio.</span>"; } 
    else { let html = ""; for (const [software, version] of Object.entries(versions)) { html += `<div><strong style="color: var(--primary); display: inline-block; width: 140px;">${esc(software)}:</strong> <span style="color: var(--success); font-weight: bold;">${esc(version)}</span></div>`; } listDiv.innerHTML = html; }
    document.getElementById('versions-modal').style.display = 'flex';
}
function closeVersionsModal() { document.getElementById('versions-modal').style.display = 'none'; }
