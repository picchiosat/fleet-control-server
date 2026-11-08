// --- SISTEMA TRADUZIONI (i18n) & HELPERS ---
const i18n = {
    en: {
        lblLogLimit: "Rows:",
        btnSched: "SCHED", ttSchedule: "Calendar Profile Scheduler", schedTitle: "CALENDAR PROFILE SCHEDULER",
        schedNew: "NEW SCHEDULED EVENT", lblSchedTitle: "Event Name:", lblSchedNodes: "Target Nodes:",
        lblSchedTargetProf: "Target Profile:", lblSchedRestoreProf: "Restore Profile:",
        lblSchedStart: "Start Date/Time:", lblSchedEnd: "End Date/Time:", btnAddSched: "CREATE SCHEDULE",
        thSchedTitle: "Title", thSchedNodes: "Nodes", thSchedProf: "Profile", thSchedStart: "Start",
        thSchedEnd: "End", thSchedStatus: "Status", thSchedActs: "Actions",
        statusScheduled: "SCHEDULED", statusActive: "ACTIVE", statusCompleted: "COMPLETED", statusCancelled: "CANCELLED", statusExpired: "EXPIRED",
        confCancelSched: "Cancel this scheduled event?", msgSchedCreated: "SCHEDULE CREATED", msgSchedCancelled: "SCHEDULE CANCELLED",
        errSchedDates: "End date must be after start date!", errMissingSchedData: "Please fill all required fields!",
        optAllNodes: "ALL NODES (FLEET)", optNone: "NONE (Leave current)",
        
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
        confOta: "EXECUTE GIT PULL ON NODE ",
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
        filtAll: "ALL_NODES", filtOnline: "ONLINE", filtOffline: "OFFLINE", filtAlerts: "ALERTS",
        fleetStatus: "[ FLEET_STATUS ]", aprsTraffic: "[ APRS_TRAFFIC ]", btnClear: "[ CLEAR ]", btnReturn: "[ < RETURN TO OVERVIEW ]",
        hwTelemetry: "[ HARDWARE_TELEMETRY ]", rfConfig: "[ RF_CONFIGURATION ]", opModes: "[ OPERATING_MODES ]", actGateways: "[ ACTIVE_GATEWAYS ]",
        tsModes: "[ TIMESLOTS_MODES ]", liveTerminal: "[ LIVE_TERMINAL ]", nodeLastheard: "[ NODE_LASTHEARD ]", adminControls: "[ ADMIN_CONTROLS ]",
        cpuLoad: "CPU_LOAD:", sysTemp: "SYS_TEMP:", ramUsage: "RAM_USAGE:", diskSpace: "DISK_SPACE:", sysUptime: "UPTIME:",
        txFreq: "TX_FREQ:", rxFreq: "RX_FREQ:", nodeLoc: "LOCATION:",
        statusOffline: "OFFLINE", statusAlert: "(!) ALERT", awaitingStream: "> AWAITING_STREAM...", focusNode: "FOCUS_NODE", noActiveGw: "NO_ACTIVE_GATEWAYS",
        lblSysUptime: "System Uptime", lblSwVersions: "Software Versions", lblOtaUpdate: "OTA Update", waitConfig: "WAITING FOR CONFIG...",
        noDaemonData: "NO DAEMON DATA YET. RETRYING...", cfgEmpty: "[!] CFG MEMORY EMPTY", netError: "NETWORK ERROR", noModesFound: "NO MODES FOUND IN CONFIG",
        accessDenied: "[ ACCESS DENIED ]", savingRestart: "⏳ SAVING & RESTARTING...", stateUpdated: "✅ STATE UPDATED SUCCESSFULLY!",
        phSearch: "SEARCH ID/CALL...", btnGrid: "[ GRID ]", btnList: "[ LIST ]"
    },
    it: {
        lblLogLimit: "Righe:",
        btnSched: "SCHED", ttSchedule: "Pianificazione Calendario Profili", schedTitle: "CALENDARIO PIANIFICAZIONE PROFILI",
        schedNew: "NUOVO EVENTO PROGRAMMATO", lblSchedTitle: "Nome Evento:", lblSchedNodes: "Nodi Coinvolti:",
        lblSchedTargetProf: "Profilo Attivazione:", lblSchedRestoreProf: "Profilo Ripristino:",
        lblSchedStart: "Data/Ora Inizio:", lblSchedEnd: "Data/Ora Fine:", btnAddSched: "CREA PIANIFICAZIONE",
        thSchedTitle: "Titolo", thSchedNodes: "Nodi", thSchedProf: "Profilo", thSchedStart: "Inizio",
        thSchedEnd: "Fine", thSchedStatus: "Stato", thSchedActs: "Azioni",
        statusScheduled: "PROGRAMMATO", statusActive: "ATTIVO", statusCompleted: "COMPLETATO", statusCancelled: "ANNULLATO", statusExpired: "SCADUTO",
        confCancelSched: "Annullare questo evento programmato?", msgSchedCreated: "PIANIFICAZIONE CREATA", msgSchedCancelled: "PIANIFICAZIONE ANNULLATA",
        errSchedDates: "La data di fine deve essere successiva a quella di inizio!", errMissingSchedData: "Compilare tutti i campi obbligatori!",
        optAllNodes: "TUTTI I NODI (FLOTTA)", optNone: "NESSUNO (Mantieni attivo)",
        
        lastTransits: "Ultimi ascolti", loginTitle: "ACCESSO SISTEMA",
        thTime: "Ora", thRep: "Ripetitore", thMode: "Modo", thCall: "Nominativo", thDur: "Durata",
        thUser: "Utente", thRole: "Ruolo", thNodes: "Nodi", thActs: "Azioni",
        btnReqCfg: "REQ_CFG", btnGlobal: "GBL_OVR", btnAdmin: "SYS_ADM", btnPass: "CHG_PWD", btnLogout: "ESCI",
        btnSvc: "SERVIZI", btnFile: "CFG", btnBoot: "RIAVVIA", btnAdd: "AGGIUNGI",
        waitNet: "> Attesa rete...", waitData: "In attesa dei dati dal nodo...", forceUpdate: "FORZA AGGIORNAMENTO",
        adminTitle: "AMMINISTRAZIONE SISTEMA", adminDBSync: "SINCRONIZZAZIONE DB", adminTime: "Orario Aggiornamento:", adminSave: "SALVA CONFIG", roleOp: "Operatore",
        modSvcTitle: "DEMONI:", modFileTitle: "FILE CONFIGURAZIONE", modEditTitle: "MODIFICA:",
        warnEdit: "[ATTENZIONE] MODIFICA DIRETTA ATTIVA",
        btnEdit: "MODIFICA", btnStart: "AVVIA", btnRestart: "RIAVVIA", btnStop: "FERMA", btnSave: "SALVA FILE",
        btnHat: "RESET HAT", confHat: "Reset hardware modem MMDVM su: ",
        confOta: "Eseguire git pull sul nodo ",
        confOp: "Confermi l'operazione su ", confTgOn: "Vuoi ATTIVARE le notifiche Telegram per il nodo ", confTgOff: "Vuoi SILENZIARE le notifiche Telegram per il nodo ", confOvr: "Sei sicuro di voler sovrascrivere il file su ",
        warnDaemon: "[ATTENZIONE] DEMONE OFFLINE",
        promptOvr: "OVERRIDE GLOBALE", promptOvrConfirm: "Confermi l'invio a TUTTA la rete?",
        modUpdateTitle: "AGGIORNAMENTO FLOTTA", confUpdate: "Vuoi richiedere i dati e i file di configurazione aggiornati a tutti i nodi della flotta?", alertUpdateOk: "CONFERMATO",
        btnConfReset: "CONFERMA", btnCancel: "ANNULLA", promptPass: "NUOVA PASSWORD:",
        titleError: "ERRORE", titleSuccess: "OK", titleAction: "CONFERMA", titleDelete: "ELIMINA UTENTE", titleSave: "SALVA", titleGlobal: "OVERRIDE GLOBALE",
        btnYes: "ESEGUI", msgDelUser: "Eliminare definitivamente l'utente?", msgPassOk: "PASSWORD AGGIORNATA", msgPassErr: "ERRORE AGGIORNAMENTO PASSWORD", msgLoginFail: "CREDENZIALI NON VALIDE",
        msgConfigSaved: "CONFIGURAZIONE SALVATA", msgConfigErr: "ERRORE SALVATAGGIO CONFIG", msgNetErr: "ERRORE DI RETE", msgOvrSel: "SELEZIONA PROFILO:",
        msgOvrOk: "COMANDO INVIATO ALLA RETE", msgMissUser: "SPECIFICARE NOME UTENTE", msgMissPass: "SPECIFICARE PASSWORD", btnSvcKo: "ERRORE DEMONE",
        phNewPass: "NUOVA PWD (VUOTA = INVARIATA)", phPass: "PASSWORD",
        titleSwitch: "CAMBIO PROFILO", confSwitch: "Passa al profilo ", titleBoot: "RIAVVIO NODO", confBoot: "Riavviare il nodo ",
        ttReqCfg: "Richiedi dati nodi", ttGlobal: "Override globale profili", ttAdmin: "Pannello amministrazione", ttPass: "Cambia password", ttLogout: "Disconnetti",
        ttProfA: "Passa al Profilo A", ttProfB: "Passa al Profilo B", ttTgOn: "Abilita notifiche Telegram", ttTgOff: "Disabilita notifiche Telegram", ttSvc: "Gestisci demoni di sistema", ttFile: "Modifica file .ini da remoto", ttHat: "Reset fisico scheda modem", ttBoot: "Riavvia sistema operativo",
        ttSwitchTo: "Passa a: ", ttSvcStart: "Avvia demone", ttSvcRestart: "Riavvia demone", ttSvcEdit: "Modifica configurazione", ttSvcStop: "Arresta demone", ttLang: "Lingua",
        statTopTG: "TOP TALKGROUP", statTopCall: "TOP NOMINATIVI", statLoading: "CARICAMENTO...", statAvgDur: "DURATA MEDIA", statTodayTx: "PASSAGGI OGGI", statNoData: "NESSUN DATO",
        statTitle: "STATISTICHE GIORNALIERE", statAllNodes: "TUTTI I NODI", modVersions: "VERSIONI SOFTWARE",
        filtAll: "TUTTI I NODI", filtOnline: "ONLINE", filtOffline: "OFFLINE", filtAlerts: "AVVISI",
        fleetStatus: "[ STATO FLOTTA ]", aprsTraffic: "[ TRAFFICO APRS ]", btnClear: "[ PULISCI ]", btnReturn: "[ < TORNA ALLA DASHBOARD ]",
        hwTelemetry: "[ TELEMETRIA HARDWARE ]", rfConfig: "[ CONFIGURAZIONE RF ]", opModes: "[ MODI OPERATIVI ]", actGateways: "[ GATEWAY ATTIVI ]",
        tsModes: "[ TIMESLOT E MODI ]", liveTerminal: "[ TERMINALE LIVE ]", nodeLastheard: "[ ULTIMI ASCOLTI NODO ]", adminControls: "[ CONTROLLI AMMINISTRATORE ]",
        cpuLoad: "CARICO CPU:", sysTemp: "TEMP. SIS:", ramUsage: "UTILIZZO RAM:", diskSpace: "SPAZIO DISCO:", sysUptime: "ATTIVITÀ:",
        txFreq: "FREQ. TX:", rxFreq: "FREQ. RX:", nodeLoc: "POSIZIONE:",
        statusOffline: "OFFLINE", statusAlert: "(!) AVVISO", awaitingStream: "> IN ATTESA DI FLUSSO DATI...", focusNode: "DETTAGLI NODO", noActiveGw: "NESSUN GATEWAY ATTIVO",
        lblSysUptime: "Tempo di attività sistema", lblSwVersions: "Versioni Software", lblOtaUpdate: "Aggiornamento OTA", waitConfig: "IN ATTESA DELLA CONFIGURAZIONE...",
        noDaemonData: "NESSUN DATO DAL DEMONE. RETENTATIVO...", cfgEmpty: "[!] MEMORIA CFG VUOTA", netError: "ERRORE DI RETE", noModesFound: "NESSUN MODO TROVATO NELLA CONFIGURAZIONE",
        accessDenied: "[ ACCESSO NEGATO ]", savingRestart: "⏳ SALVATAGGIO & RIAVVIO IN CORSO...", stateUpdated: "✅ STATO AGGIORNATO CON SUCCESSO!",
        phSearch: "CERCA ID/CALL...", btnGrid: "[ GRIGLIA ]", btnList: "[ LISTA ]",
        liveLogTitle: "[ LIVE_LOG: ", filterAll: "TUTTI I DEMONI", btnScrollOn: "SCROLL: ON", btnScrollOff: "SCROLL: OFF", btnClear: "PULISCI",
        logConnWait: "Connessione in corso... In attesa dei log per ", logNoData: "Nessun log recente in memoria per ", logApplyFilter: "Applicazione filtro...", btnDownloadZip: "[ SCARICA_TUTTI_CFG_ZIP ]", lblHistory: "STORICO:", optCurrentUnsaved: "Attuale (Non salvata)", btnPreviewDiff: "[ ANTEPRIMA_DIFF ]", btnCancelDiff: "ANNULLA", titleAuditLogs: "[ LOG_SICUREZZA_AUDIT ]", btnRefresh: "AGGIORNA", btnRefreshBracket: "[ AGGIORNA ]", waitLoading: "In attesa di caricamento...", titleAnalytics: "[ ANALITICHE_NODO ]", msgNoAudit: "Nessun log di sicurezza presente.", msgNoModifications: "[ NESSUNA MODIFICA RILEVATA RISPETTO ALLA CONFIGURAZIONE ATTIVA ]", warnUnverifiedDiff: "Non hai verificato il Diff visivo. Sicuro di voler sovrascrivere?", chartTemp: "Temp °C", chartCpu: "CPU %", chartTransits: "Transiti", chartBer: "BER Medio %"
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
    if (newPassInput && typeof editingUserId !== 'undefined' && editingUserId) newPassInput.placeholder = t('phNewPass');
    else if (newPassInput) newPassInput.placeholder = t('phPass');
    
    const searchInput = document.getElementById('node-search');
    if (searchInput) searchInput.placeholder = t('phSearch') || 'SEARCH ID/CALL...';
    
    if (typeof applyViewMode === 'function') applyViewMode();
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
async function openAdmin() {
    document.getElementById('admin-modal').style.display = 'flex';
    
    // Inietto i bottoni operativi dentro l'header del pannello admin
    let adminBtnsHtml = '';
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const hasAllNodes = allowedList.includes('all');
    const canOverride = hasAllNodes;

    if (role === 'admin') {
        adminBtnsHtml += `<button id="server-update-btn-modal" onclick="confirmServerUpdate(); closeAdmin();" class="btn-cmd" style="border-color:var(--danger); color:var(--danger) !important; display:none; width:auto; padding: 4px 10px; font-size: 0.75rem;">[ UPD_SERVER ]</button>`;
        adminBtnsHtml += `<button onclick="sendGlobalUpdate(); closeAdmin();" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important; width:auto; padding: 4px 10px; font-size: 0.75rem;">[ REQ_CFG ]</button>`;
    }
    if (role === 'admin' || role === 'node_admin') {
        adminBtnsHtml += `<button onclick="openScheduleModal(); closeAdmin();" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important; width:auto; padding: 4px 10px; font-size: 0.75rem;">[ SCHED ]</button>`;
    }
    if (canOverride) {
        adminBtnsHtml += `<button onclick="triggerGlobalEmergency(); closeAdmin();" class="btn-cmd" style="border-color:var(--danger); color:var(--danger) !important; width:auto; padding: 4px 10px; font-size: 0.75rem;">[ GBL_OVR ]</button>`;
    }

    const adminActionDiv = document.getElementById('admin-action-btns');
    if (adminActionDiv) {
        adminActionDiv.innerHTML = adminBtnsHtml;
        // Se siamo admin eseguiamo anche un check per l'update del server per mostrare/nascondere il tasto
        if (role === 'admin' && typeof GLOBAL_SERVER_UPDATE_AVAILABLE !== 'undefined' && GLOBAL_SERVER_UPDATE_AVAILABLE) {
             const upBtn = document.getElementById('server-update-btn-modal');
             if(upBtn) upBtn.style.display = 'inline-block';
        }
    }

    if (me.role === 'admin') {
        loadUsers();
        loadSettings();
        cancelEdit();
    }
    loadAuditLogs();
}
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
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const hasAll = allowedList.includes('all');

    let uniqueProfiles = {};
    for (const id in globalHealthData) { 
        if (!hasAll && !allowedList.includes(id.toLowerCase())) continue;
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
    container.innerHTML = html; 

    const descText = hasAll ? t('msgOvrSel') : (currentLang === 'it' ? `SELEZIONA PROFILO (NODI ASSEGNATI: ${allowedList.length}):` : `SELECT PROFILE (NODES: ${allowedList.length}):`);
    document.getElementById('override-desc').innerText = descText; 
    document.getElementById('override-modal').style.display = 'flex';
}

function sendGlobalAction(action) {
    document.getElementById('override-modal').style.display = 'none';
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const hasAll = allowedList.includes('all');

    const confirmMsg = hasAll 
        ? t('promptOvrConfirm') 
        : (currentLang === 'it' 
            ? `Confermi l'invio ai tuoi nodi autorizzati (${allowedList.map(n => n.toUpperCase()).join(', ')})?` 
            : `Confirm sending to your authorized nodes (${allowedList.map(n => n.toUpperCase()).join(', ')})?`);

    customConfirm(t('titleGlobal'), confirmMsg, "var(--danger)", async () => {
        try { 
            const res = await fetch('/api/global_command', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({type: action}) 
            }); 
            const d = await res.json(); 
            if(d.success) customAlert(t('titleSuccess'), t('msgOvrOk')); 
            else customAlert(t('titleError'), esc(d.error), true); 
            refreshStates();
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
            <button onclick="closeConfigsModal(); openEditorModal(${q(clientId)}, ${q(f)})" class="btn-cmd" style="border-color:var(--accent); color:var(--accent) !important; width: 80px; flex: 0 0 80px; padding: 6px;">${t('btnEdit')}</button>
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

// --- MODALE EDITOR INI E BACKUP HISTORY ---
let currentEditClient = ""; let currentEditService = ""; let currentOriginalConfig = ""; let isDiffMode = false;
let historyConfigs = {}; // Cache per i backup

async function openEditorModal(clientId, service) {
    currentEditClient = clientId; currentEditService = service; isDiffMode = false;
    document.getElementById('editor-title').innerText = `${service.toUpperCase()} @ ${clientId.toUpperCase()}`;
    document.getElementById('config-textarea').value = "AWAITING_STREAM..."; 
    document.getElementById('config-textarea').style.display = 'block';
    document.getElementById('diff-view').style.display = 'none';
    document.getElementById('btn-cancel-diff').style.display = 'none';
    document.getElementById('editor-status').innerText = ""; 
    document.getElementById('editor-modal').style.display = 'flex';
    document.getElementById('config-history-select').innerHTML = `<option value="">${t('optCurrentUnsaved')}</option>`;
    historyConfigs = {};
    
    try { 
        const res = await fetch(`/api/config_file/${encodeURIComponent(clientId)}/${encodeURIComponent(service)}`); 
        const data = await res.json(); 
        if (data.success) {
            currentOriginalConfig = data.data.raw_text || "";
            document.getElementById('config-textarea').value = currentOriginalConfig; 
            fetchConfigHistory(clientId, service);
        } else {
            document.getElementById('config-textarea').value = "ERR:\n" + data.error; 
        }
    } catch(e) { 
        document.getElementById('config-textarea').value = "NET_ERR"; 
    }
}

async function fetchConfigHistory(clientId, service) {
    try {
        const res = await fetch(`/api/config_backups/${encodeURIComponent(clientId)}/${encodeURIComponent(service)}`);
        const data = await res.json();
        if (data.success && data.backups.length > 0) {
            const select = document.getElementById('config-history-select');
            data.backups.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.id;
                opt.text = `${b.timestamp} (${b.username})`;
                select.appendChild(opt);
            });
        }
    } catch(e) { console.error("History fetch error:", e); }
}

async function loadHistoryConfig() {
    const val = document.getElementById('config-history-select').value;
    if (!val) {
        // Ripristina testualmente la versione corrente se scelgono "Attuale"
        document.getElementById('config-textarea').value = currentOriginalConfig;
        return;
    }
    
    if (historyConfigs[val]) {
        document.getElementById('config-textarea').value = historyConfigs[val];
        return;
    }
    
    try {
        const res = await fetch(`/api/config_backups/${val}`);
        const data = await res.json();
        if (data.success) {
            historyConfigs[val] = data.text;
            document.getElementById('config-textarea').value = data.text;
        }
    } catch (e) { console.error(e); }
}

function previewConfigDiff() {
    const newText = document.getElementById('config-textarea').value;
    const diffView = document.getElementById('diff-view');
    const textarea = document.getElementById('config-textarea');
    
    if (isDiffMode) {
        // Torna all'editor
        textarea.style.display = 'block';
        diffView.style.display = 'none';
        document.getElementById('btn-cancel-diff').style.display = 'none';
        isDiffMode = false;
        return;
    }
    
    // Calcola il diff visivo
    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(currentOriginalConfig, newText);
    dmp.diff_cleanupSemantic(diffs);
    
    let html = "";
    diffs.forEach(part => {
        const type = part[0]; // -1 rimossa, 1 aggiunta, 0 uguale
        const text = esc(part[1]);
        if (type === 1) html += `<span style="background-color: rgba(46, 204, 113, 0.2); color: #2ecc71;">${text}</span>`;
        else if (type === -1) html += `<span style="background-color: rgba(231, 76, 60, 0.2); color: #e74c3c; text-decoration: line-through;">${text}</span>`;
        else html += `<span style="color: var(--text-muted); opacity: 0.8;">${text}</span>`;
    });
    
    if (diffs.length === 1 && diffs[0][0] === 0) {
        html = `<span style="color: var(--success); font-weight: bold;">${t('msgNoModifications')}</span>\n\n` + html;
    }
    
    diffView.innerHTML = html;
    textarea.style.display = 'none';
    diffView.style.display = 'block';
    document.getElementById('btn-cancel-diff').style.display = 'block';
    isDiffMode = true;
}

function cancelDiff() {
    document.getElementById('config-textarea').style.display = 'block';
    document.getElementById('diff-view').style.display = 'none';
    document.getElementById('btn-cancel-diff').style.display = 'none';
    isDiffMode = false;
}

function closeEditorModal() { document.getElementById('editor-modal').style.display = 'none'; }

function saveConfig() {
    const textValue = document.getElementById('config-textarea').value; 
    const statusSpan = document.getElementById('editor-status');
    
    if (!isDiffMode && textValue !== currentOriginalConfig) {
        customConfirm(t('titleSave'), t('warnUnverifiedDiff'), "var(--accent)", () => executeSave(textValue, statusSpan));
    } else {
        customConfirm(t('titleSave'), `${t('confOvr')}<b>${currentEditClient.toUpperCase()}</b>?`, "var(--danger)", () => executeSave(textValue, statusSpan));
    }
}

async function executeSave(textValue, statusSpan) {
    statusSpan.innerText = "WRITING..."; statusSpan.style.color = "var(--success)";
    try {
        const res = await fetch('/api/config_file', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ clientId: currentEditClient, service: currentEditService, config_data: { "raw_text": textValue } }) });
        const data = await res.json();
        if (data.success) { 
            customAlert(t('titleSuccess'), "FILE_WRITTEN"); 
            currentOriginalConfig = textValue; // Aggiorna l'originale corrente
            closeEditorModal(); 
        } else { 
            customAlert(t('titleError'), "ERR: " + esc(data.error), true); statusSpan.innerText = "ERR"; 
        }
    } catch(e) { customAlert(t('titleError'), t('msgNetErr'), true); statusSpan.innerText = "NET_ERR"; }
}

// --- MODALE VERSIONI SOFTWARE ---
function openVersionsModal(clientId) {
    const versions = globalVersionsData[clientId.toLowerCase()]; const listDiv = document.getElementById('versions-list');
    if (!versions || Object.keys(versions).length === 0) { listDiv.innerHTML = "<p style='font-family:\"JetBrains Mono\",monospace;'>NO_DATA. RESTART SVCS TO PUSH LOGS.</p>"; } 
    else { let html = ""; for (const [software, version] of Object.entries(versions)) { html += `<div style="border-bottom:1px dashed var(--border-light); padding:5px 0;"><strong style="color: var(--primary); display: inline-block; width: 140px;">${esc(software)}:</strong> <span style="color: var(--success); font-weight: 400;">${esc(version)}</span></div>`; } listDiv.innerHTML = html; }
    document.getElementById('versions-modal').style.display = 'flex';
}
function closeVersionsModal() { document.getElementById('versions-modal').style.display = 'none'; }


// -------------------- LIVE LOG MODAL --------------------
let currentLogClientId = null;

function openLogModal(clientId) {
    currentLogClientId = clientId.toLowerCase();
    document.getElementById('log-modal-title').innerText = clientId.toUpperCase();
    document.getElementById('log-console').innerHTML = `<span style="color: #8b949e;">${t('logConnWait')} ${clientId.toUpperCase()}...</span>\n`;
    document.getElementById('log-modal').style.display = 'flex';
    document.getElementById('log-service-filter').value = 'ALL';
    
    // 1. Fetch initial logs
    fetch(`/api/logs/${clientId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.logs.length > 0) {
                document.getElementById('log-console').innerHTML = '';
                data.logs.forEach(log => appendLog(log));
            } else {
                document.getElementById('log-console').innerHTML = `<span style="color: #8b949e;">${t('logNoData')} ${clientId.toUpperCase()}.</span>\n`;
            }
        })
        .catch(err => console.error("Errore fetch logs:", err));
        
    // 2. Subscribe WebSocket
    window.socket.on('live_log_' + currentLogClientId, function(logEntry) {
        appendLog(logEntry);
    });
}

function closeLogModal() {
    document.getElementById('log-modal').style.display = 'none';
    if (currentLogClientId) {
        window.socket.off('live_log_' + currentLogClientId);
    }
    currentLogClientId = null;
}

let autoScroll = true;

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const btn = document.getElementById('btn-autoscroll');
    if (autoScroll) {
        btn.innerText = t('btnScrollOn') || 'SCROLL: ON';
        btn.style.borderColor = 'var(--accent)';
        btn.style.setProperty('color', 'var(--accent)', 'important');
        scrollToBottom();
    } else {
        btn.innerText = t('btnScrollOff') || 'SCROLL: OFF';
        btn.style.borderColor = 'var(--text-muted)';
        btn.style.setProperty('color', 'var(--text-muted)', 'important');
    }
}

function clearLogs() {
    document.getElementById('log-console').innerHTML = '';
}

function scrollToBottom() {
    const box = document.getElementById('log-console');
    box.scrollTop = box.scrollHeight;
}

function appendLog(log) {
    const filter = document.getElementById('log-service-filter').value.toLowerCase();
    const logSvc = log.service.toLowerCase();
    if (filter !== 'all' && !logSvc.includes(filter)) {
        return;
    }
    
    const box = document.getElementById('log-console');
    
    let color = '#c9d1d9';
    let prefix = log.service.toLowerCase();
    
    if (prefix.includes('mmdvm')) color = '#58a6ff';
    else if (prefix.includes('dmr')) color = '#3fb950';
    else if (prefix.includes('ysf')) color = '#8b5cf6'; // Violetto per YSF
    else if (prefix.includes('dstar') || prefix.includes('d-star')) color = '#f97316'; // Arancio per D-Star
    else if (prefix.includes('nxdn')) color = '#10b981'; // Verde NXDN
    else if (prefix.includes('p25')) color = '#ffcc00'; // Giallo P25
    
    const span = document.createElement('div');
    span.style.marginBottom = '2px';
    
    const timeSpan = `<span style="color: #8b949e;">[${log.time}]</span>`;
    const svcSpan = `<span style="color: ${color}; font-weight: bold;">[${log.service}]</span>`;
    
    span.innerHTML = `${timeSpan} ${svcSpan} ${escapeHtml(log.text)}`;
    
    // Remove default "Connessione in corso..." if present
    if (box.innerHTML.includes(t('logConnWait'))) {
        box.innerHTML = '';
    }
    
    box.appendChild(span);
    
    // Keep max 1000 lines in DOM to prevent lag
    if (box.childElementCount > 1000) {
        box.removeChild(box.firstChild);
    }
    
    if (autoScroll) scrollToBottom();
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function renderLogs() {
    // When filter changes, we just clear and wait for new logs, or we could refetch.
    // For simplicity, we clear the console and fetch again from server.
    if (currentLogClientId) {
        document.getElementById('log-console').innerHTML = `<span style="color: #8b949e;">${t('logApplyFilter')}</span>\n`;
        fetch(`/api/logs/${currentLogClientId}`)
            .then(res => res.json())
            .then(data => {
                document.getElementById('log-console').innerHTML = '';
                if (data.success) {
                    data.logs.forEach(log => appendLog(log));
                }
            });
    }
}


// --- SECURITY AUDIT LOGS ---
async function loadAuditLogs() {
    try {
        const res = await fetch('/api/audit_logs');
        const data = await res.json();
        const container = document.getElementById('audit-logs-container');
        if (data.success && data.logs) {
            if (data.logs.length === 0) {
                container.innerHTML = `<span style="color: var(--text-muted);">${t('msgNoAudit')}</span>`;
                return;
            }
            let html = '';
            data.logs.forEach(log => {
                html += `<div style="border-bottom: 1px dashed var(--border-light); padding: 4px 0; display: flex; gap: 15px;">
                            <span style="color: var(--text-muted); flex: 0 0 140px;">[${log.time}]</span>
                            <span style="color: var(--primary); flex: 0 0 100px;">${esc(log.user.toUpperCase())}</span>
                            <span style="color: var(--success); flex: 0 0 80px;">${esc(log.node.toUpperCase())}</span>
                            <span style="color: var(--text-main); flex: 1;">${esc(log.cmd)}</span>
                         </div>`;
            });
            container.innerHTML = html;
        }
    } catch(e) { console.error("Error loading audit logs:", e); }
}


// --- MODALE CALENDARIO SCHEDULAZIONE PROFILI ---
async function openScheduleModal() {
    document.getElementById('schedule-modal').style.display = 'flex';
    populateScheduleNodeOptions();
    loadSchedules();
    
    // Inizializza le date con orari coerenti (Inizio: adesso + 5 min, Fine: adesso + 2 ore)
    const now = new Date();
    const in5m = new Date(now.getTime() + 5 * 60000);
    const in2h = new Date(now.getTime() + 125 * 60000);
    
    const toLocalISO = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    
    document.getElementById('sched-start').value = toLocalISO(in5m);
    document.getElementById('sched-end').value = toLocalISO(in2h);
}

function closeScheduleModal() {
    document.getElementById('schedule-modal').style.display = 'none';
}

function updateScheduleProfileOptions() {
    const selNodes = document.getElementById('sched-nodes-select');
    const selTarget = document.getElementById('sched-target-prof');
    const selRestore = document.getElementById('sched-restore-prof');
    if (!selNodes || !selTarget || !selRestore) return;
    
    // Proviamo a estrarre i nomi dei profili dal primo nodo selezionato
    const selectedCid = selNodes.value;
    let profiles = { "A": "Profilo A", "B": "Profilo B" }; // Default
    
    if (selectedCid !== 'all' && globalHealthData[selectedCid] && globalHealthData[selectedCid].profiles) {
        profiles = globalHealthData[selectedCid].profiles;
    } else {
        // Se è 'all', cerchiamo il primo nodo disponibile che abbia i profili valorizzati
        for (let cid in globalHealthData) {
            if (globalHealthData[cid] && globalHealthData[cid].profiles && Object.keys(globalHealthData[cid].profiles).length > 0) {
                profiles = globalHealthData[cid].profiles;
                break;
            }
        }
    }
    
    // Aggiorniamo le select
    let htmlTarget = "";
    let htmlRestore = "";
    
    for (const [pKey, pLabel] of Object.entries(profiles)) {
        htmlTarget += `<option value="${pKey}">${pKey} (${esc(pLabel)})</option>`;
        htmlRestore += `<option value="${pKey}">${pKey} (${esc(pLabel)})</option>`;
    }
    htmlRestore += `<option value="NONE" data-i18n="optNone">NONE (Leave active)</option>`;
    
    // Salviamo i valori attuali se possibile per non resettarli
    const currTarget = selTarget.value;
    const currRestore = selRestore.value;
    
    selTarget.innerHTML = htmlTarget;
    selRestore.innerHTML = htmlRestore;
    
    if(currTarget && [...selTarget.options].some(o => o.value === currTarget)) selTarget.value = currTarget;
    if(currRestore && [...selRestore.options].some(o => o.value === currRestore)) selRestore.value = currRestore;
    
    // Riapplichiamo le traduzioni per l'opzione NONE se in italiano
    if (currentLang === 'it') {
        const noneOpt = selRestore.querySelector('option[value="NONE"]');
        if(noneOpt) noneOpt.innerText = "NESSUNO (Mantieni attivo)";
    }
}

function populateScheduleNodeOptions() {
    const sel = document.getElementById('sched-nodes-select');
    if (!sel) return;
    
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    const hasAll = allowedList.includes('all');
    
    let html = '';
    if (hasAll || role === 'admin') {
        html += `<option value="all">${t('optAllNodes')}</option>`;
    }
    
    clients.forEach(c => {
        if (hasAll || allowedList.includes(c.id.toLowerCase())) {
            html += `<option value="${c.id}">${esc(c.name)} (${c.id.toUpperCase()})</option>`;
        }
    });
    
    sel.innerHTML = html;
    sel.addEventListener('change', updateScheduleProfileOptions);
    updateScheduleProfileOptions();
}

async function loadSchedules() {
    const tbody = document.getElementById('schedules-table-body');
    if (!tbody) return;
    
    try {
        const res = await fetch('/api/schedules');
        const data = await res.json();
        
        if (!data.success || !data.schedules || data.schedules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:15px;">NO_SCHEDULES_FOUND</td></tr>`;
            return;
        }
        
        tbody.innerHTML = data.schedules.map(s => {
            let statusColor = "var(--text-muted)";
            let statusClass = "";
            let statusText = s.status;
            
            if (s.status === 'SCHEDULED') {
                statusColor = "#f59e0b";
                statusText = t('statusScheduled');
            } else if (s.status === 'ACTIVE') {
                statusColor = "var(--success)";
                statusClass = "blink";
                statusText = t('statusActive');
            } else if (s.status === 'COMPLETED') {
                statusColor = "var(--text-muted)";
                statusText = t('statusCompleted');
            } else if (s.status === 'CANCELLED') {
                statusColor = "var(--danger)";
                statusText = t('statusCancelled');
            } else if (s.status === 'EXPIRED') {
                statusColor = "var(--text-muted)";
                statusText = t('statusExpired');
            }
            
            const isFinished = ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(s.status);
            
            
            // Tentativo di dedurre il profilo di partenza dal primo nodo o dai nodi target
            let startProf = "?";
            let cids = s.target_nodes.toLowerCase() === 'all' ? Object.keys(globalHealthData) : s.target_nodes.toLowerCase().split(',');
            for (let i = 0; i < cids.length; i++) {
                let cid = cids[i].trim();
                let card = document.getElementById(`card-${cid}`);
                if (card && card.dataset.lastMode) {
                    startProf = card.dataset.lastMode;
                    // Se leggiamo DMR o D-STAR non è un nome di profilo. Dobbiamo guardare se nel telemetry c'è una hint
                    let tel = latestStatesData && latestStatesData.telemetry && latestStatesData.telemetry[cid] ? latestStatesData.telemetry[cid] : {};
                    if(tel.alt && tel.alt.includes('SCHED:')) {
                         startProf = tel.alt.split(':')[1].trim();
                    }
                    break;
                }
            }
            if (startProf === "?" || startProf.length > 5) startProf = "CURR"; // Current

            let profDisplay = `<span style="color:var(--text-muted);">${esc(startProf)}</span> ➔ <b style="color:var(--accent);">${esc(s.target_profile)}</b>`;
            if (s.restore_profile !== 'NONE') {
                profDisplay += ` ➔ <span style="color:var(--success);">${esc(s.restore_profile)}</span>`;
            }

            return `<tr>
                <td style="font-weight:bold; color:var(--text-main);">${esc(s.title)}</td>
                <td><span style="color:var(--primary); font-family:'JetBrains Mono',monospace;">${esc(s.target_nodes.toUpperCase())}</span></td>
                <td style="font-family:'JetBrains Mono',monospace;">${profDisplay}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${esc(s.start_time.substring(5, 16))}</td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${esc(s.end_time.substring(5, 16))}</td>
                <td><span class="${statusClass}" style="color:${statusColor}; font-weight:bold; font-size:0.8rem;">[ ${statusText} ]</span></td>
                <td style="text-align:right;">
                    ${!isFinished ? `<button onclick="cancelSchedule(${s.id})" class="btn-cmd" style="border-color:var(--danger); color:var(--danger)!important; padding:4px 8px; font-size:0.75rem; width:auto; flex:none;">DEL</button>` : '—'}
                </td>
            </tr>`;
        }).join('');
        
    } catch(e) {
        console.error("Error loading schedules:", e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:15px;">NET_ERR</td></tr>`;
    }
}

async function submitSchedule() {
    const title = document.getElementById('sched-title').value.trim();
    const targetNodes = document.getElementById('sched-nodes-select').value;
    const targetProf = document.getElementById('sched-target-prof').value.trim().toUpperCase();
    const restoreProf = document.getElementById('sched-restore-prof').value.trim().toUpperCase();
    const startTime = document.getElementById('sched-start').value;
    const endTime = document.getElementById('sched-end').value;
    
    if (!title || !targetNodes || !targetProf || !startTime || !endTime) {
        return customAlert(t('titleError'), t('errMissingSchedData'), true);
    }
    
    if (startTime >= endTime) {
        return customAlert(t('titleError'), t('errSchedDates'), true);
    }
    
    const payload = {
        title: title,
        target_nodes: targetNodes,
        target_profile: targetProf,
        restore_profile: restoreProf,
        start_time: startTime,
        end_time: endTime
    };
    
    try {
        const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            customAlert(t('titleSuccess'), t('msgSchedCreated'));
            document.getElementById('sched-title').value = '';
            loadSchedules();
        } else {
            customAlert(t('titleError'), esc(data.error), true);
        }
    } catch(e) {
        console.error(e);
        customAlert(t('titleError'), t('msgNetErr'), true);
    }
}

function cancelSchedule(sid) {
    customConfirm(t('titleAction'), t('confCancelSched'), "var(--danger)", async () => {
        try {
            const res = await fetch(`/api/schedules/${sid}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                customAlert(t('titleSuccess'), t('msgSchedCancelled'));
                loadSchedules();
            } else {
                customAlert(t('titleError'), esc(data.error), true);
            }
        } catch(e) {
            console.error(e);
            customAlert(t('titleError'), t('msgNetErr'), true);
        }
    });
}
