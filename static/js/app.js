function updateClock() {
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('it-IT', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' });
        clockEl.innerHTML = `<span style="color:var(--primary);">SYS_TIME:</span> ${dateStr} // <b style="color:var(--text-main);">${timeStr}</b> LOC`;
    }
}

// --- VARIABILI GLOBALI E UI VIEW ---
let clients = []; 
let me = { logged_in: false, user: '', role: '', allowed_nodes: '' }; 
let isAuthenticated = false; 
let usersCache = {}; 
let globalHealthData = {}; 
let globalVersionsData = {}; 
let editingUserId = null; 
let currentResetHatId = null; 
let confirmActionCallback = null; 

let currentFilter = 'all'; 
let searchQuery = ''; 
let viewMode = localStorage.getItem('fleetViewMode') || 'grid';
let fleetMap = null; 
let mapMarkers = {};

let currentFocusedNode = null;
let currentMmdvmConfig = "";
let currentMmdvmConfigAlias = ""; 
let currentMmdvmServiceName = "";

// --- LAYOUT SWITCHER ---
const layouts = ['layout-blueprint', 'layout-tactical', 'layout-light', 'layout-glass'];
const layoutLabels = ['[ L: BLU ]', '[ L: TAC ]', '[ L: LGT ]', '[ L: GLASS ]'];
let currentLayoutIdx = 0;

function initLayout() {
    const saved = localStorage.getItem('fleetLayout') || 'layout-blueprint';
    currentLayoutIdx = layouts.indexOf(saved) > -1 ? layouts.indexOf(saved) : 0;
    applyLayout();
}

function cycleLayout() {
    currentLayoutIdx = (currentLayoutIdx + 1) % layouts.length;
    localStorage.setItem('fleetLayout', layouts[currentLayoutIdx]);
    applyLayout();
}

function applyLayout() {
    document.body.classList.remove(...layouts);
    if (layouts[currentLayoutIdx] !== 'layout-blueprint') {
        document.body.classList.add(layouts[currentLayoutIdx]);
    }
    const btn = document.getElementById('layout-btn');
    if (btn) btn.innerText = layoutLabels[currentLayoutIdx];
}


// Mappatura Modo -> Gateway service name
const MODE_GATEWAYS = {
    'DMR': ['dmrgateway'],
    'NXDN': ['nxdngateway'],
    'System Fusion': ['ysfgateway'],
    'D-Star': ['dstargateway', 'dstar-gateway'],
    'P25': ['p25gateway'],
    'M17': ['m17gateway', 'm17-gateway']
};

function switchView(viewName) {
    currentFocusedNode = null; 
    document.getElementById('view-focus').style.display = 'none';
    
    document.getElementById('view-home').style.display = 'none';
    document.getElementById('view-nodes').style.display = 'none';
    document.getElementById('view-map').style.display = 'none';
    document.getElementById('view-aprs').style.display = 'none';
    
    document.getElementById('tab-home').classList.remove('active');
    document.getElementById('tab-nodes').classList.remove('active');
    document.getElementById('tab-map').classList.remove('active');
    document.getElementById('tab-aprs').classList.remove('active');
    
    document.getElementById(`view-${viewName}`).style.display = 'block';
    document.getElementById(`tab-${viewName}`).classList.add('active');
    localStorage.setItem('fleetDefaultView', viewName);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (viewName === 'nodes') { applyViewMode(); }
    else if (viewName === 'map') { setTimeout(() => { initOrUpdateMap(); }, 100); }
}

function openNodeFocus(clientId) {
    currentFocusedNode = clientId;
    
    document.getElementById('view-home').style.display = 'none';
    document.getElementById('view-nodes').style.display = 'none';
    document.getElementById('view-map').style.display = 'none';
    document.getElementById('view-aprs').style.display = 'none';
    
    document.getElementById('tab-home').classList.remove('active');
    document.getElementById('tab-nodes').classList.remove('active');
    document.getElementById('tab-map').classList.remove('active');
    document.getElementById('tab-aprs').classList.remove('active');
    
    document.getElementById('view-focus').style.display = 'block';
    


    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    let canControl = isAuthenticated && (allowedList.includes('all') || allowedList.includes(clientId.toLowerCase()));
    
    const modesCard = document.getElementById('focus-modes-card');
    if (modesCard) {
        modesCard.style.display = canControl ? 'block' : 'none';
    }
    
    if (canControl) {
        document.getElementById('focus-modes-toggles').innerHTML = '<span style="color:var(--text-muted); font-size: 0.9rem;" class="blink">FETCHING CONFIG...</span>';
        fetchNodeConfigForModes(clientId);
    }
    
    refreshStates(); 
    refreshLogs();   
}

function closeNodeFocus() {
    currentFocusedNode = null;
    document.getElementById('view-focus').style.display = 'none';
    const modesCard = document.getElementById('focus-modes-card');
    if (modesCard) modesCard.style.display = 'none';
    switchView(localStorage.getItem('fleetDefaultView') || 'home');
}

window.addEventListener('DOMContentLoaded', () => {
    const savedView = localStorage.getItem('fleetDefaultView') || 'home';
    switchView(savedView);
    initLayout();
    initUI(); 
    checkPushStatus();
    setInterval(updateClock, 1000); updateClock();
    setInterval(refreshStates, 15000); 
    setInterval(() => { refreshLogs(); refreshStats(); }, 60000);
    checkServerUpdate();
    setInterval(checkServerUpdate, 3600000); 
    refreshAprs();
});

// --- FUNZIONI FILTRO E LAYOUT ---
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-pill').forEach(btn => {
        if (btn.getAttribute('onclick') === `setFilter('${filter}')`) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    applyFilters();
}

function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'list' : 'grid';
    localStorage.setItem('fleetViewMode', viewMode);
    applyViewMode();
}

function applyViewMode() {
    const gridDiv = document.getElementById('client-grid');
    const btnToggle = document.getElementById('view-toggle-btn');
    if (viewMode === 'list') {
        gridDiv.className = 'list-view';
        btnToggle.innerText = t('btnList') || '[ LIST ]';
    } else {
        gridDiv.className = 'grid';
        btnToggle.innerText = t('btnGrid') || '[ GRID ]';
    }
}

function applyFilters() {
    const searchEl = document.getElementById('node-search');
    if(!searchEl) return;
    searchQuery = searchEl.value.toLowerCase();
    
    clients.forEach(c => {
        const card = document.getElementById(`card-${c.id}`);
        if (!card) return;
        
        let show = true;
        let status = card.dataset.status || 'offline';
        let gatewaysStr = card.dataset.gateways || ''; 
        let hasAlert = card.dataset.hasWarn === 'true';
        
        if (currentFilter === 'online' && status !== 'online') show = false;
        if (currentFilter === 'offline' && status === 'online') show = false;
        if (currentFilter === 'alerts' && !hasAlert) show = false;
        if (['dmr', 'ysf', 'd-star', 'nxdn'].includes(currentFilter)) {
            if (!gatewaysStr.includes(currentFilter)) show = false;
        }
        
        if (searchQuery !== '') {
            const searchStr = `${c.id.toLowerCase()} ${c.name.toLowerCase()} ${(card.dataset.loc || '').toLowerCase()}`;
            if (!searchStr.includes(searchQuery)) show = false;
        }
        
        card.style.display = show ? 'flex' : 'none';
    });
}

function fmtAge(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h';
    return Math.floor(sec / 86400) + 'd';
}

function seenItem(label, age, tip, warn) {
    const cls = warn ? 'warn' : (age !== undefined && age < 300 ? 'ok' : 'idle');
    const txt = age === undefined ? '—' : fmtAge(age);
    return `<span class="seen-item ${cls}" title="${esc(tip)}">${warn ? '[!] ' : ''}${label} <b>${txt}</b></span>`;
}

function renderSeen(c, data, isOnline) {
    const div = document.getElementById(`seen-${c.id}`);
    if (!div) return;
    const it = currentLang === 'it';
    const ages = (data.last_seen && data.last_seen[c.id.toLowerCase()]) || {};
    const upSec = data.uptime || 0;
    let html = '';

    const warnM = ages.mmdvm === undefined && isOnline && upSec > 600;
    const tipM = it ? `Topic mmdvm/${c.id}/json` : `Topic mmdvm/${c.id}/json`;
    html += seenItem('MMDVM', ages.mmdvm, tipM, warnM);

    if (ages.gateway !== undefined) {
        html += seenItem('GW', ages.gateway, 'Gateway Events', false);
    }

    const hObj = (data.health && data.health[c.id.toLowerCase()]) || {};
    const iv = Number(hObj.interval) > 0 ? Number(hObj.interval) : 60;
    const warnA = isOnline && (ages.health === undefined ? upSec > Math.max(300, iv * 5) : ages.health > Math.max(180, iv * 3));
    html += seenItem('AGENT', ages.health, 'Agent Status', warnA);

    div.innerHTML = html;
    div.style.display = 'flex';
}

function sendCommand(clientId, type, customTitle, customMsg, customColor) {
    const title = customTitle || t('titleAction');
    const msg = customMsg || `${t('confOp')}<b>${clientId.toUpperCase()}</b>?`;
    const color = customColor || "var(--primary)";
    customConfirm(title, msg, color, async () => {
        try {
            const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, type }) });
            const data = await res.json();
            if(!data.success) { customAlert(t('titleError'), esc(data.error), true); }
            refreshStates();
        } catch (e) { console.error(e); }
    });
}

function confirmSwitch(id, mode) { 
    const data = globalHealthData[id.toLowerCase()];
    let profileName = mode === 'A' ? "PROF A" : "PROF B";
    if (data && data.profiles && data.profiles[mode]) profileName = data.profiles[mode];
    const title = `[ SW_PROFILE ]`;
    const msg = `${t('confSwitch')} <b>${esc(profileName)}</b> -> <b>${id.toUpperCase()}</b>?`;
    const color = mode === 'A' ? "var(--accent)" : "var(--primary)";
    sendCommand(id, mode, title, msg, color); 
}

function confirmReboot(id) { sendCommand(id, 'REBOOT', `[ REBOOT ]`, `${t('confBoot')}<b>${id.toUpperCase()}</b>?`, "var(--danger)"); }
function confirmUpdateAgent(id) { sendCommand(id, 'UPDATE_AGENT', `[ OTA_UPDATE ]`, `${t('confOta')}<b>${id.toUpperCase()}</b>?`, "var(--primary)"); }    

function sendTgCommand(clientId, comando) {
    const msg = (comando === 'TG:ON') ? t('confTgOn') : t('confTgOff');
    customConfirm("[ TELEGRAM ]", `${msg}<b>${clientId.toUpperCase()}</b>?`, "var(--primary)", async () => {
        try {
            const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientId, type: comando }) });
            const data = await res.json();
            if(!data.success) { customAlert(t('titleError'), esc(data.error), true); }
            refreshStates();
        } catch (e) { console.error(e); }
    });
}

// --- LOGICA MODI OPERATIVI E GATEWAYS ---
async function fetchNodeConfigForModes(clientId) {
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    let canControl = isAuthenticated && (allowedList.includes('all') || allowedList.includes(clientId.toLowerCase()));
    const modesCard = document.getElementById('focus-modes-card');
    if (!canControl) {
        if (modesCard) modesCard.style.display = 'none';
        return;
    }
    if (modesCard) modesCard.style.display = 'block';

    try {
        const healthObj = globalHealthData[clientId.toLowerCase()];
        if (!healthObj) {
            document.getElementById('focus-modes-toggles').innerHTML = '<span style="color:var(--danger); font-size: 0.9rem;">NO DAEMON DATA YET. RETRYING...</span>';
            setTimeout(() => { if (currentFocusedNode === clientId) fetchNodeConfigForModes(clientId); }, 2000);
            return;
        }
        
        let filesList = healthObj.files || healthObj.config_files || [];
        let iniFile = filesList.find(f => String(f).toLowerCase().includes('mmdvm') && String(f).toLowerCase().endsWith('.ini'));
        if(!iniFile) iniFile = "MMDVMHost.ini";
        
        let svcName = Object.keys(healthObj.processes || {}).find(k => k.toLowerCase().includes('mmdvm')) || "mmdvmhost";
        currentMmdvmServiceName = svcName;
        
        let candidates = ["mmdvm", svcName, "mmdvmhost", iniFile, "MMDVMHost.ini"];
        let foundText = null;

        for (let candidate of candidates) {
            if(!candidate) continue;
            try {
                let res = await fetch(`/api/config_file/${encodeURIComponent(clientId)}/${encodeURIComponent(candidate)}`);
                let data = await res.json();
                if (data.success && data.data && data.data.raw_text && data.data.raw_text.length > 100) {
                    foundText = data.data.raw_text;
                    currentMmdvmConfigAlias = candidate; // Alias con cui salvare
                    break; 
                }
            } catch(e) {} 
        }
        
        if (foundText) {
            currentMmdvmConfig = foundText;
            renderModeToggles(clientId);
        } else {
            document.getElementById('focus-modes-toggles').innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
                    <span style="color:var(--accent); font-size: 0.8rem;">[!] CFG MEMORY EMPTY</span>
                    <button class="btn-cmd" style="border-color:var(--accent); color:var(--accent)!important; width:auto; padding:4px 10px; flex:none;" onclick="fetch('/api/update_nodes', {method: 'POST'}); this.innerText='WAIT...'; setTimeout(() => fetchNodeConfigForModes('${clientId}'), 5000);">[ REQ_DATA ]</button>
                </div>
            `;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('focus-modes-toggles').innerHTML = '<span style="color:var(--danger); font-size: 0.9rem;">NETWORK ERROR</span>';
    }
}

function renderModeToggles(clientId, statusMsg = "") {
    const role = me.role || '';
    const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    let canControl = isAuthenticated && (allowedList.includes('all') || allowedList.includes(clientId.toLowerCase()));
    
    const modesCard = document.getElementById('focus-modes-card');
    if (modesCard) {
        modesCard.style.display = canControl ? 'block' : 'none';
    }

    let container = document.getElementById('focus-modes-toggles');
    if (!container) return;

    if (!canControl) {
        container.innerHTML = '<span style="color:var(--danger); font-size: 0.9rem;">[ ACCESS DENIED ]</span>';
        return;
    }

    const modes = [
        { id: 'DMR', label: 'DMR', color: 'var(--primary)' },
        { id: 'D-Star', label: 'D-STAR', color: '#f97316' },
        { id: 'System Fusion', label: 'YSF', color: '#8b5cf6' },
        { id: 'NXDN', label: 'NXDN', color: 'var(--success)' },
        { id: 'P25', label: 'P25', color: 'var(--accent)' },
        { id: 'FM', label: 'FM', color: '#14b8a6' },
        { id: 'M17', label: 'M17', color: '#ec4899' } // Aggiunto modo M17 (Rosa/Pink)
    ];
    
    let html = "";
    let lines = currentMmdvmConfig.split('\n');
    
    modes.forEach(m => {
        let enabled = false;
        let sectionFound = false;
        let currentSection = "";
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('[') && line.endsWith(']')) {
                currentSection = line.substring(1, line.length - 1);
            }
            if (currentSection.toLowerCase() === m.id.toLowerCase() && line.toLowerCase().startsWith('enable')) {
                sectionFound = true;
                let parts = line.split('=');
                if (parts.length === 2 && parts[1].trim() === '1') {
                    enabled = true;
                }
                break;
            }
        }
        
        if (sectionFound) {
            let btnStyle = enabled 
                ? `border-color: ${m.color}; color: ${m.color} !important; box-shadow: inset 0 0 8px ${m.color}; font-weight: bold;` 
                : `border-color: var(--border-light); color: var(--text-muted) !important; opacity: 0.4;`;
                
            // Rimosso flex:1 per evitare che l'ultimo bottone si allarghi al 100% sulla riga vuota
            html += `<button class="btn-cmd" style="padding: 10px; font-size: 1.1rem; width: 100%; transition: all 0.2s ease; ${btnStyle}" onclick="toggleOperatingMode('${clientId}', '${m.id}', ${!enabled})">${m.label}</button>`;
        }
    });
    
    if (html === "") {
        html = '<span style="color:var(--text-muted); font-size: 0.9rem;">NO MODES FOUND IN CONFIG</span>';
    } else {
        // Avvolgiamo i bottoni in una CSS Grid per un allineamento perfetto e proporzionato
        html = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: 10px; width: 100%;">${html}</div>`;
    }
    
    if (statusMsg) {
        html += `<div style="width: 100%; margin-top: 12px; font-family: 'JetBrains Mono', monospace;">${statusMsg}</div>`;
    }
    
    container.innerHTML = html;
}

function toggleOperatingMode(clientId, section, enable) {
    const title = currentLang === 'it' ? "[ CAMBIO_MODO ]" : "[ MODE_TOGGLE ]";
    const msg = currentLang === 'it' 
        ? `Vuoi ${enable ? 'ABILITARE' : 'DISABILITARE'} il modo <b>${section}</b>?<br><br><span style="font-size:0.8rem; color:var(--text-muted);">Verranno aggiornati MMDVMHost e il relativo Gateway.</span>`
        : `${enable ? 'ENABLE' : 'DISABLE'} mode <b>${section}</b>?<br><br><span style="font-size:0.8rem; color:var(--text-muted);">This will update MMDVMHost and its Gateway.</span>`;
        
    customConfirm(title, msg, enable ? "var(--success)" : "var(--danger)", async () => {
        // 1. Aggiorna subito il testo locale del file INI
        let lines = currentMmdvmConfig.split('\n');
        let currentSection = "";
        for (let i = 0; i < lines.length; i++) {
            let cleanLine = lines[i].trim();
            if (cleanLine.startsWith('[') && cleanLine.endsWith(']')) {
                currentSection = cleanLine.substring(1, cleanLine.length - 1);
            }
            if (currentSection.toLowerCase() === section.toLowerCase() && cleanLine.toLowerCase().startsWith('enable')) {
                lines[i] = lines[i].replace(/Enable\s*=\s*[01]/i, `Enable=${enable ? "1" : "0"}`);
                break;
            }
        }
        currentMmdvmConfig = lines.join('\n');
        
        // 2. Ridisegna SUBITO i pulsanti (così il tasto cambia stato all'istante) e mostra la nota di caricamento
        renderModeToggles(clientId, '<span style="color:var(--accent); font-size:0.8rem;" class="blink">⏳ SALVATAGGIO & RIAVVIO IN CORSO...</span>');
        
        try {
            // 3. Salva il file INI
            const resSave = await fetch('/api/config_file', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ 
                    clientId: clientId, 
                    service: currentMmdvmConfigAlias, 
                    config_data: { "raw_text": currentMmdvmConfig } 
                }) 
            });
            const dataSave = await resSave.json();
            if (!dataSave.success) throw new Error("SAVE ERR: " + dataSave.error);

            // 4. Invia start/stop al Gateway associato
            const healthObj = globalHealthData[clientId.toLowerCase()] || {};
            const gwCandidates = MODE_GATEWAYS[section] || [];
            const runningProcs = Object.keys(healthObj.processes || {});
            const targetGw = gwCandidates.find(g => runningProcs.some(p => p.toLowerCase() === g.toLowerCase()));
            
            if (targetGw) {
                const gwAction = enable ? 'start' : 'stop';
                await fetch('/api/service_control', { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({ clientId: clientId, service: targetGw, action: gwAction }) 
                });
            }
            
            // 5. Riavvia MMDVMHost
            const resRst = await fetch('/api/service_control', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ clientId: clientId, service: currentMmdvmServiceName, action: 'restart' }) 
            });
            const dataRst = await resRst.json();
            if (!dataRst.success) throw new Error("RESTART ERR: " + dataRst.error);
            
            // 6. Conferma avvenuta applicazione senza ricaricare file vecchi
            renderModeToggles(clientId, '<span style="color:var(--success); font-size:0.8rem;">✅ STATO AGGIORNATO CON SUCCESSO!</span>');
            
            // Rimuove il messaggio di conferma dopo 3 secondi lasciando i bottoni nello stato nuovo
            setTimeout(() => {
                if (currentFocusedNode === clientId) {
                    renderModeToggles(clientId);
                }
            }, 3000);
            
        } catch (e) {
            console.error(e);
            customAlert(t('titleError'), String(e), true);
            fetchNodeConfigForModes(clientId);
        }
    });
}

// --- INIT APP ---
async function initUI() {
    applyTranslations();
    try {
        try { const meRes = await fetch('/api/me'); if (meRes.ok) me = await meRes.json(); } catch (e) { console.error(e); }
        isAuthenticated = !!me.logged_in;

        const response = await fetch('/api/clients');
        clients = await response.json();
        clients = clients.filter(c => /^[A-Za-z0-9_\-]+$/.test(String(c.id)));

        const statSelect = document.getElementById('stat-node-filter');
        if (statSelect) {
            let opts = `<option value="all">ALL_NODES</option>`;
            clients.forEach(c => { opts += `<option value="${c.id}">${esc(c.name)} (${c.id.toUpperCase()})</option>`; });
            statSelect.innerHTML = opts;
        }

        const limitSel = document.getElementById('log-limit-select');
        if (limitSel) {
            limitSel.value = localStorage.getItem('fleetLogLimit') || '60';
        }
        const grid = document.getElementById('client-grid');
        const authContainer = document.getElementById('auth-container');
        const role = me.role || '';
        const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

        if (isAuthenticated) {
            const hasAllNodes = allowedList.includes('all');
            const canOverride = hasAllNodes;

            let actionBtns = '';
            if (role === 'admin') {
                actionBtns += `<button id="server-update-btn" onclick="confirmServerUpdate()" class="auth-btn" style="border-color:var(--danger); color:var(--danger) !important; display:none;" title="Aggiornamento Server Disponibile">[ UPD_SERVER ]</button>`;
                actionBtns += `<button onclick="sendGlobalUpdate()" class="auth-btn" style="color:var(--accent);" data-i18n-title="ttReqCfg" title="${t('ttReqCfg')}">[ ${t('btnReqCfg')} ]</button>`;
            }
            if (canOverride) {
                actionBtns += `<button onclick="triggerGlobalEmergency()" class="auth-btn" style="color:var(--danger);" data-i18n-title="ttGlobal" title="${t('ttGlobal')}">[ ${t('btnGlobal')} ]</button>`;
            }
            if (role === 'admin') {
                actionBtns += `<button onclick="openAdmin()" class="auth-btn" style="color:var(--primary);" data-i18n-title="ttAdmin" title="${t('ttAdmin')}">[ ${t('btnAdmin')} ]</button>`;
            }
            
            authContainer.innerHTML = `${actionBtns}
                                       <span style="font-weight:300; font-size:0.85rem; margin: 0 10px; font-family:'JetBrains Mono', monospace; color:var(--primary);">USR: ${esc(String(me.user).toUpperCase())}</span>
                                       <button onclick="changeMyPassword()" class="auth-btn" data-i18n-title="ttPass" title="${t('ttPass')}">[ ${t('btnPass')} ]</button>
                                       <button onclick="logout()" class="auth-btn" data-i18n-title="ttLogout" title="${t('ttLogout')}">[ ${t('btnLogout')} ]</button>`;
        } else {
            authContainer.innerHTML = `<button onclick="openLoginModal()" class="auth-btn" style="color:var(--success);">[ AUTH ]</button>`;
        }

        grid.innerHTML = clients.map(c => {
            let canControl = isAuthenticated && (allowedList.includes('all') || allowedList.includes(c.id.toLowerCase()));
            let showReboot = (role === 'admin' && canControl); 

            return `
                <div class="card" id="card-${c.id}" data-status="offline" data-gateways="" data-loc="" data-has-warn="false">
                    <div class="card-header">
                        <span class="client-name" title="${esc(c.name)}"><span class="tactical-led" id="led-status-${c.id}"></span> ${esc(c.name)}</span>
                        <div class="header-badges">
                            <span class="badge-id">NET-ID: ${c.id.toUpperCase()}</span>
                            <span class="badge-id" id="agent-badge-${c.id}" style="display: none; color: var(--primary);"></span>
                            <div id="type-badge-${c.id}" class="type-badge" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <div class="gateway-bar" id="gw-bar-${c.id}"></div>
                    
                    <div class="freq-bar" id="freq-container-${c.id}" style="display: none;">
                        <span>TX: <span class="freq-tx" id="freq-tx-${c.id}">...</span></span>
                        <span>RX: <span class="freq-rx" id="freq-rx-${c.id}">...</span></span>
                    </div>
                    <div class="node-meta" id="meta-container-${c.id}" style="display: none;">
                        <span class="node-meta-item">LOC: <strong id="loc-${c.id}">...</strong></span>
                        <span class="node-meta-item" style="color: var(--text-muted);">LAT: <span id="lat-${c.id}">...</span> | LON: <span id="lon-${c.id}">...</span></span>
                    </div>
                    
                    <div class="health-bar" id="health-${c.id}" style="display: none;">
                        <span>PWR: <span id="cpu-${c.id}">--</span>%</span>
                        <span>TMP: <span id="temp-${c.id}">--</span>°C</span>
                        <span>MEM: <span id="ram-${c.id}">--</span>%</span>
                        <span>DSK: <span id="disk-${c.id}">--</span>%</span>
                        <span style="grid-column: span 2;" title="System Uptime">UPT: <span id="up-${c.id}">--</span></span>
                    </div>
                    
                    <div class="seen-bar" id="seen-${c.id}" style="display: none;"></div>
                    <div class="status-display" id="status-${c.id}">OFFLINE</div>

                    <div id="diag-warn-${c.id}" class="blink" style="display: none; border: 1px dashed var(--accent); padding: 8px 12px; margin-bottom: 12px; font-size: 0.8rem; font-weight: bold; color: var(--accent); line-height: 1.5; text-align: center;"></div>
                    
                    <div id="ts-container-${c.id}" class="ts-container">
                        <div class="dmr-info" id="dmr-ts1-${c.id}">TS1: ...</div>
                        <div class="dmr-info" id="dmr-ts2-${c.id}">TS2: ...</div>
                    </div>
                    <div class="dmr-info" id="dmr-alt-${c.id}" style="display: none; text-align: center; font-weight: 400;"></div>
                    
                    <div class="terminal-log" id="sys-log-${c.id}">> AWAITING_STREAM...</div>

                    <div id="svc-warn-${c.id}" class="blink" style="display: none; text-align: center; margin-bottom: 15px; border: 1px dashed var(--danger); padding: 10px; color: var(--danger);">
                        <span style="font-size: 0.85rem; font-family: 'JetBrains Mono';" data-i18n="warnDaemon">${t('warnDaemon')}</span>
                    </div>
                    
                    ${canControl ? `
                    <div id="prof-btns-${c.id}" style="width: 100%; gap: 10px; display: none; margin-bottom: 8px;"></div>
                    <div style="width: 100%; display: flex; gap: 10px; margin-bottom: 8px;">
                        <button class="btn-cmd" title="${t('ttTgOn')}" onclick="sendTgCommand('${c.id}', 'TG:ON')">[ TG_ON ]</button>
                        <button class="btn-cmd" title="${t('ttTgOff')}" onclick="sendTgCommand('${c.id}', 'TG:OFF')">[ TG_OFF ]</button>
                    </div>
                    ` : ''}
                    
                    ${showReboot ? `
                    <details class="admin-dropdown" style="width: 100%;">
                        <summary id="admin-summary-${c.id}" class="btn-cmd" style="color: var(--text-muted) !important;">[ SYS_TOOLS ]</summary>
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 10px;">
                            <button class="btn-cmd" style="border-color: var(--primary); color: var(--primary) !important;" title="Versioni Software" onclick="openVersionsModal('${c.id}')">INFO</button>
                            <button id="btn-svc-${c.id}" class="btn-cmd" style="border-color: var(--text-main);" title="${t('ttSvc')}" onclick="openServicesModal('${c.id}')">${t('btnSvc')}</button>
                            <button class="btn-cmd" style="border-color: var(--accent); color: var(--accent) !important;" title="${t('ttFile')}" onclick="openConfigsModal('${c.id}')">${t('btnFile')}</button>
                            <button class="btn-cmd" style="border-color: var(--danger); color: var(--danger) !important;" title="${t('ttHat')}" onclick="confirmHatReset('${c.id}')">${t('btnHat')}</button>
                            <button class="btn-cmd" style="border-color: var(--danger); color: var(--danger) !important;" title="${t('ttBoot')}" onclick="confirmReboot('${c.id}')">${t('btnBoot')}</button>
                            <button id="btn-ota-${c.id}" class="btn-cmd" style="border-color: var(--primary); color: var(--primary) !important;" title="Update OTA" onclick="confirmUpdateAgent('${c.id}')">OTA</button>
                        </div>
                    </details>
                    ` : ''}
                </div>`;
        }).join('');

        const miniGrid = document.getElementById('home-mini-nodes');
        if (miniGrid) {
            miniGrid.innerHTML = clients.map(c => `
                <div id="mini-card-${c.id}" class="mini-card" onclick="openNodeFocus('${c.id}')" style="width: 180px !important; min-width: 180px !important; height: 125px !important; display: flex; flex-direction: column; justify-content: space-between; padding-bottom: 12px; box-sizing: border-box;">
                    <div class="mini-card-content" style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        <div id="mini-name-${c.id}" class="mini-card-name" title="${esc(c.name)}">${esc(c.name)}</div>
                        <div id="mini-id-${c.id}" style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">ID: ${c.id.toUpperCase()}</div>
                        <div id="mini-caller-${c.id}" style="font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: bold; margin-top: 6px; display: none; text-align: center; line-height: 1.1;"></div>
                    </div>
                    <div id="mini-status-${c.id}" class="mini-card-status" title="OFFLINE" style="position: relative !important; bottom: auto !important; left: auto !important; transform: none !important; width: 90%; margin: 0 auto; flex-shrink: 0;">OFFLINE</div>
                </div>
            `).join('');
        }

        refreshStates(); refreshLogs(); refreshStats();
    } catch (e) { console.error(e); }
}

async function performLogin() {
    const user = document.getElementById('modal-username').value; const pass = document.getElementById('modal-password').value;
    if (!user || !pass) return;
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, pass }) });
    const data = await res.json();
    if (res.ok) { location.reload(); }
    else if (res.status === 429) { customAlert(t('titleError'), esc(data.error || t('msgLoginFail')), true); }
    else { customAlert(t('titleError'), t('msgLoginFail'), true); }
}
async function logout() { try { await fetch('/api/logout', { method: 'POST' }); } catch (e) { console.error(e); } sessionStorage.clear(); location.reload(); }

// --- LOGICA FLEET MAP V5.0 ---
let latestStatesData = null;
function initOrUpdateMap() {
    if (!fleetMap) {
        fleetMap = L.map('map-container').setView([46.06, 13.23], 9);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap France',
            maxZoom: 19,
            className: 'dark-tiles'
        }).addTo(fleetMap);
    } else {
        fleetMap.invalidateSize();
    }

    if (!latestStatesData) return;

    let bounds = [];
    clients.forEach(c => {
        try {
            const cid = c.id.toLowerCase();
            const info = latestStatesData.info && latestStatesData.info[cid];
            const gen = latestStatesData.general && latestStatesData.general[cid];
            const state = latestStatesData.states[cid] || "OFFLINE";
            const isOnline = !state.toUpperCase().includes("OFF") && state !== "";
            const health = latestStatesData.health && latestStatesData.health[cid];
            const card = document.getElementById(`card-${c.id}`);
            
            // Recupariamo lo stato calcolato in refreshStates()
            const isTx = card && card.dataset.isTx === 'true';
            const isHold = card && card.dataset.isHold === 'true';
            const warns = (latestStatesData.warnings && latestStatesData.warnings[cid]) || [];

            if (info && info.lat && info.lon && parseFloat(info.lat) !== 0 && parseFloat(info.lon) !== 0) {
                const lat = parseFloat(info.lat);
                const lon = parseFloat(info.lon);
                bounds.push([lat, lon]);

                let pinClass = isOnline ? (warns.length > 0 ? 'pin-warn' : 'pin-online') : 'pin-offline';
                if (isTx || isHold) pinClass += ' pin-tx';

                let iconSymbol = "+";
                if (warns.length > 0 && !isTx) iconSymbol = "!";

                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="custom-map-pin ${pinClass}" style="width: 24px; height: 24px;">${iconSymbol}</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                const call = (gen && gen.callsign) ? gen.callsign : c.name;
                const warnsHtml = warns.length > 0 ? `
                    <div style="border: 1px dashed var(--accent); padding: 4px 8px; margin-bottom: 8px; font-size: 0.75rem; color: var(--accent); font-weight: bold;">
                        ${warns.map(w => esc(w)).join('<br>')}
                    </div>
                ` : '';

                const popupContent = `
                    <div style="font-family: 'JetBrains Mono', monospace; min-width: 190px;">
                        <div style="font-weight: 400; font-size: 1.1rem; color: var(--primary); margin-bottom: 4px;">${esc(call)}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px; border-bottom: 1px dashed var(--border-main); padding-bottom: 4px;">ID: ${c.id.toUpperCase()} | ${isOnline ? '<span style="color:var(--success);">ONLINE</span>' : '<span style="color:var(--danger);">OFFLINE</span>'}</div>
                        ${warnsHtml}
                        <div style="font-size: 0.8rem; margin-bottom: 4px; color:var(--text-main);">LOC: <strong>${esc(info.loc)}</strong></div>
                        <div style="font-size: 0.8rem; color: var(--danger);">TX: ${esc(info.tx)}</div>
                        <div style="font-size: 0.8rem; color: var(--success); margin-bottom: 6px;">RX: ${esc(info.rx)}</div>
                        ${health ? `<div style="font-size: 0.75rem; margin-bottom: 8px; color: var(--border-main);">TMP: <b>${health.temp}°C</b> | CPU: <b>${health.cpu}%</b></div>` : ''}
                        <button onclick="openNodeFocus('${c.id}')" class="btn-cmd" style="width: 100%; margin-top:5px;">[ FOCUS_NODE ]</button>
                    </div>
                `;

                if (!mapMarkers[cid]) {
                    mapMarkers[cid] = L.marker([lat, lon], { icon: customIcon }).addTo(fleetMap).bindPopup(popupContent);
                } else {
                    mapMarkers[cid].setLatLng([lat, lon]);
                    mapMarkers[cid].setIcon(customIcon);
                    mapMarkers[cid].setPopupContent(popupContent);
                }
            }
        } catch(err) { console.error("Map rendering error for node", c.id, err); }
    });

    if (bounds.length > 0 && !fleetMap._hasFitted) {
        fleetMap.fitBounds(bounds, { padding: [40, 40] });
        fleetMap._hasFitted = true;
    }
}

async function refreshStates() {
    try {
        const res = await fetch('/api/states'); const data = await res.json();
        latestStatesData = data;
        globalVersionsData = data.versions || {};

        clients.forEach(c => {
            try {
                let stateValue = data.states[c.id.toLowerCase()] || data.states[c.id] || "OFFLINE";
                stateValue = String(stateValue).trim().toUpperCase(); 
                const isOnline = !stateValue.includes("OFF") && stateValue !== "";
                
                let genObj = data.general && data.general[c.id.toLowerCase()];
                let healthObj = data.health && data.health[c.id.toLowerCase()];
                let infoObj = data.info && data.info[c.id.toLowerCase()];
                
                let telemetryObj = data.telemetry[c.id.toLowerCase()] || data.telemetry[c.id] || { ts1: "...", ts2: "...", alt: "", idle: true };
                if (typeof telemetryObj === 'string') telemetryObj = { ts1: telemetryObj, ts2: "...", alt: "", idle: true };
                
                const role = me.role || '';
                const allowedList = String(me.allowed_nodes || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
                let canControl = isAuthenticated && (allowedList.includes('all') || allowedList.includes(c.id.toLowerCase()));
                let showReboot = (role === 'admin' && canControl); 

                let isTx = false; 
                let activeModeColor = "var(--primary)"; 
                let txModeStr = "TX";
                let isIdle = telemetryObj.idle === true;
                
                if (telemetryObj.alt && telemetryObj.alt !== "") {
                    let altText = telemetryObj.alt.toUpperCase();
                    if (altText.includes("NXDN")) { activeModeColor = "var(--success)"; txModeStr = "TX NXDN"; }
                    else if (altText.includes("YSF")) { activeModeColor = "#8b5cf6"; txModeStr = "TX YSF"; }
                    else if (altText.includes("D-STAR")) { activeModeColor = "#f97316"; txModeStr = "TX D-STAR"; }
                    else if (altText.includes("P25")) { activeModeColor = "var(--accent)"; txModeStr = "TX P25"; }
                    
                    isTx = (altText.includes("🟢") || altText.includes("🟣") || altText.includes("🔵") || altText.includes("🟠"));
                } else {
                    let v1 = String(telemetryObj.ts1 ?? '');
                    let v2 = String(telemetryObj.ts2 ?? '');
                    if (v1.includes("🎙️") || v1.includes("TX") || v2.includes("🎙️") || v2.includes("TX")) {
                        isTx = true;
                        activeModeColor = "var(--primary)";
                        txModeStr = "TX DMR";
                    }
                }
                
                const statusDiv = document.getElementById(`status-${c.id}`); 
                const cardDiv = document.getElementById(`card-${c.id}`);
                
                if (cardDiv) {
                    cardDiv.dataset.status = isOnline ? 'online' : 'offline';
                    renderSeen(c, data, isOnline);
                    
                    let warns = (data.warnings && data.warnings[c.id.toLowerCase()]) ? [...data.warnings[c.id.toLowerCase()]] : [];
                    
                    let hasOfflineService = false;
                    if (healthObj && healthObj.processes) { 
                        for (const [svcName, svcStatus] of Object.entries(healthObj.processes)) { 
                            let s = svcStatus.toLowerCase();
                            if (s !== 'online' && s !== 'standby') { 
                                hasOfflineService = true; 
                                warns.push(`SVC KO: ${svcName.toUpperCase()}`);
                            } 
                        } 
                    }
                    
                    if (!latestStatesData.warnings) latestStatesData.warnings = {};
                    latestStatesData.warnings[c.id.toLowerCase()] = warns;
                    
                    cardDiv.dataset.hasWarn = (warns.length > 0) ? 'true' : 'false';
                    const diagDiv = document.getElementById(`diag-warn-${c.id}`);
                    if (diagDiv) {
                        if (warns.length > 0 && isOnline) {
                            diagDiv.style.display = 'block';
                            diagDiv.innerHTML = warns.map(w => `<div>[!] ${esc(w)}</div>`).join('');
                        } else {
                            diagDiv.style.display = 'none';
                            diagDiv.innerHTML = '';
                        }
                    }

                    const nameSpan = cardDiv.querySelector('.client-name');
                    const idBadge = cardDiv.querySelector('.badge-id');
                    const typeBadge = document.getElementById(`type-badge-${c.id}`);

                    if (genObj && isOnline) {
                        nameSpan.innerHTML = `${esc(genObj.callsign)}`;
                        idBadge.innerText = `NET-ID: ${genObj.radio_id}`; 
                        if (typeBadge && genObj.duplex !== undefined) {
                            typeBadge.style.display = 'inline-block';
                            if (genObj.duplex === "1") { typeBadge.innerText = "RPT"; typeBadge.className = "type-badge type-repeater"; } 
                            else { typeBadge.innerText = "HST"; typeBadge.className = "type-badge type-hotspot"; }
                        }
                    } else {
                        nameSpan.innerHTML = `${esc(c.name)}`;
                        idBadge.innerText = `NET-ID: ${c.id.toUpperCase()}`;
                        if (typeBadge) typeBadge.style.display = 'none';
                    }
                    
                    const tsContainer = document.getElementById(`ts-container-${c.id}`); const ts1Div = document.getElementById(`dmr-ts1-${c.id}`); const ts2Div = document.getElementById(`dmr-ts2-${c.id}`); const altDiv = document.getElementById(`dmr-alt-${c.id}`);
                    
                    if (telemetryObj.alt && telemetryObj.alt !== "") {
                        if (tsContainer) tsContainer.style.display = "none";
                        if (altDiv) {
                            altDiv.style.display = "block"; altDiv.innerText = telemetryObj.alt; 
                            if (isTx) { altDiv.style.color = activeModeColor; altDiv.style.borderColor = activeModeColor; } 
                            else { altDiv.style.color = "var(--text-muted)"; altDiv.style.borderColor = "var(--border-light)"; }
                        }
                    } else {
                        if (altDiv) altDiv.style.display = "none";
                        if (tsContainer) tsContainer.style.display = "flex";
                        if (ts1Div && ts2Div) {
                            let isSimplex = (genObj && genObj.duplex === "0");
                            ts1Div.style.display = isSimplex ? 'none' : 'block';
                            [ts1Div, ts2Div].forEach((div, idx) => {
                                if (isSimplex && idx === 0) return;
                                const val = String((idx === 0 ? telemetryObj.ts1 : telemetryObj.ts2) ?? '');
                                div.innerText = `TS${idx + 1}: ${val}`;
                                if (val.includes("🎙️") || val.includes("TX")) { div.style.color = activeModeColor; div.style.borderColor = activeModeColor; } 
                                else { div.style.color = "var(--text-muted)"; div.style.borderColor = "var(--border-light)"; }
                            });
                        }
                    }
                    
                    const freqContainer = document.getElementById(`freq-container-${c.id}`); const freqTx = document.getElementById(`freq-tx-${c.id}`); const freqRx = document.getElementById(`freq-rx-${c.id}`);
                    const metaContainer = document.getElementById(`meta-container-${c.id}`); 
                    const locSpan = document.getElementById(`loc-${c.id}`);
                    const latSpan = document.getElementById(`lat-${c.id}`);
                    const lonSpan = document.getElementById(`lon-${c.id}`);

                    if (infoObj && isOnline) {
                        if (freqContainer) { freqContainer.style.display = 'flex'; freqTx.innerText = infoObj.tx; freqRx.innerText = infoObj.rx; }
                        if (metaContainer) { 
                            metaContainer.style.display = 'block'; 
                            locSpan.innerText = infoObj.loc; 
                            cardDiv.dataset.loc = infoObj.loc;
                            if(latSpan) latSpan.innerText = infoObj.lat;
                            if(lonSpan) lonSpan.innerText = infoObj.lon;
                        }
                    } else {
                        if (freqContainer) freqContainer.style.display = 'none'; 
                        if (metaContainer) metaContainer.style.display = 'none'; 
                    }

                    const healthContainer = document.getElementById(`health-${c.id}`); const cpuSpan = document.getElementById(`cpu-${c.id}`); const tempSpan = document.getElementById(`temp-${c.id}`); const ramSpan = document.getElementById(`ram-${c.id}`); const diskSpan = document.getElementById(`disk-${c.id}`);
                    const gwBar = document.getElementById(`gw-bar-${c.id}`);
                    let gwHtml = "";
                    if (gwBar && healthObj) {
                        let gwData = data.gateway_states && data.gateway_states[c.id.toLowerCase()] ? data.gateway_states[c.id.toLowerCase()] : {}; let processes = healthObj.processes || {}; let activeGatewaysStr = "";
                        const gwMap = [{ id: 'dmrgateway', label: 'DMR', color: 'var(--primary)', proto: 'DMR' }, { id: 'ysfgateway', label: 'YSF', color: '#8b5cf6', proto: 'YSF' }, { id: 'dstargateway', label: 'D-STAR', color: '#f97316', proto: 'D-STAR' }, { id: 'nxdngateway', label: 'NXDN', color: 'var(--success)', proto: 'NXDN' }, { id: 'p25gateway', label: 'P25', color: 'var(--accent)', proto: 'P25' }];
                        
                        if (isOnline) {
                            gwMap.forEach(gw => {
                                let isActiveProc = processes[gw.id] && processes[gw.id].toLowerCase() === 'online';
                                if (isActiveProc) {
                                    activeGatewaysStr += gw.proto.toLowerCase() + ",";
                                    let stateInfo = gwData[gw.proto] || { action: 'IDLE', dest: '---' }; let action = (stateInfo.action || 'IDLE').toLowerCase(); let dest = stateInfo.dest && stateInfo.dest !== '---' && stateInfo.dest.toUpperCase() !== 'IDLE' ? stateInfo.dest : '';
                                    let badgeColor, badgeBorder, suffix = '';
                                    
                                    if (action === 'linking') { badgeColor = gw.color; badgeBorder = gw.color; suffix = dest ? `: ${dest} [LNK]` : ` [LNK]`; } 
                                    else if (action === 'linked' || (dest !== '' && action !== 'unlinked' && action !== 'failed' && action !== 'status')) { badgeColor = '#fff'; badgeBorder = gw.color; if (dest) suffix = `:${dest}`; } 
                                    else if (action === 'failed') { badgeColor = 'var(--danger)'; badgeBorder = 'var(--danger)'; suffix = ' [ERR]'; } 
                                    else if (action === 'unlinked') { badgeColor = 'var(--text-muted)'; badgeBorder = 'var(--border-light)'; suffix = ' [UNL]'; } 
                                    else { badgeColor = gw.color; badgeBorder = gw.color; }
                                    
                                    const chipBase = "display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; font-family:'JetBrains Mono',monospace; padding:2px 6px; margin:2px 4px 2px 0; border-radius:3px; background:rgba(0,0,0,0.5); border:1px solid ";
                                    
                                    if (gw.proto === 'DMR' && gwData['DMR_NETS'] && gwData['DMR_NETS'].length > 0) {
                                        gwData['DMR_NETS'].forEach(netName => {
                                            let tagStatus = (action === 'linking') ? '<span style="color:#f59e0b;font-weight:700;">LNK</span>' : (action === 'failed' ? '<span style="color:var(--danger);font-weight:700;">ERR</span>' : (dest && action !== 'status' ? `<span style="color:#ffffff;font-weight:600;">${esc(dest)}</span>` : ''));
                                            gwHtml += `<span style="${chipBase}${badgeBorder};"><b style="color:${gw.color};">DMR</b><span style="color:#e2e8f0;">${esc(netName)}</span>${tagStatus ? '<span style="color:var(--text-muted);opacity:0.6;">·</span>' + tagStatus : ''}</span>`;
                                        });
                                    } else {
                                        let destText = dest ? `<span style="color:#ffffff; font-weight:600;">${esc(dest)}</span>` : '';
                                        let statusPill = '';
                                        if (action === 'linking') statusPill = '<span style="color:#f59e0b; font-weight:700;">LNK</span>';
                                        else if (action === 'failed') statusPill = '<span style="color:var(--danger); font-weight:700;">ERR</span>';
                                        else if (action === 'unlinked') statusPill = '<span style="color:var(--text-muted);">UNL</span>';
                                        
                                        let content = `<b style="color:${gw.color};">${gw.label}</b>`;
                                        if (destText) content += `<span style="color:var(--text-muted);opacity:0.6;">·</span>${destText}`;
                                        if (statusPill) content += `<span style="color:var(--text-muted);opacity:0.6;">·</span>${statusPill}`;

                                        gwHtml += `<span style="${chipBase}${badgeBorder};">${content}</span>`;
                                    }
                                }
                            });
                        }
                        cardDiv.dataset.gateways = activeGatewaysStr; gwBar.innerHTML = gwHtml;
                    } else if (gwBar) { gwBar.innerHTML = ""; cardDiv.dataset.gateways = ""; }

                    if (healthObj && isOnline) {
                        healthContainer.style.display = 'grid';
                        cpuSpan.innerText = healthObj.cpu; tempSpan.innerText = healthObj.temp; ramSpan.innerText = healthObj.ram; diskSpan.innerText = healthObj.disk;
                        let upSpan = document.getElementById(`up-${c.id}`); if (upSpan && healthObj.uptime) { upSpan.innerText = fmtAge(healthObj.uptime); }
                        
                        const profBtnsDiv = document.getElementById(`prof-btns-${c.id}`);
                        const profKeys = JSON.stringify(healthObj.profiles || {});
                        if (profBtnsDiv && profBtnsDiv.dataset.keys !== profKeys) {
                            profBtnsDiv.dataset.keys = profKeys;
                            if (healthObj.profiles && Object.keys(healthObj.profiles).length > 0) {
                                profBtnsDiv.style.display = 'flex';
                                let html = ''; const colors = ["var(--accent)", "var(--success)", "var(--primary)"]; let idx = 0;
                                for (const [pKey, pLabel] of Object.entries(healthObj.profiles)) {
                                    let col = colors[idx % colors.length];
                                    html += `<button class="btn-cmd" style="border-color: ${col}; color:${col} !important;" onclick="confirmSwitch('${c.id}', ${q(pKey)})">[ ${esc(pLabel)} ]</button>`;
                                    idx++;
                                }
                                profBtnsDiv.innerHTML = html;
                            } else { profBtnsDiv.style.display = 'none'; profBtnsDiv.innerHTML = ''; }
                        }
                    } else { 
                        if (healthContainer) healthContainer.style.display = 'none'; 
                    }

                    // Logica tollerante per i Gateway in standby (hasOfflineService calcolato in alto)
                    const warnBadge = document.getElementById(`svc-warn-${c.id}`); const btnSvc = document.getElementById(`btn-svc-${c.id}`);
                    if (warnBadge) warnBadge.style.display = hasOfflineService ? 'block' : 'none';
                    if (btnSvc) { if (hasOfflineService) { btnSvc.style.borderColor = 'var(--danger)'; btnSvc.style.color = 'var(--danger)'; } else { btnSvc.style.borderColor = 'var(--text-main)'; btnSvc.style.color = 'var(--text-main)'; } }

                    let btnOta = document.getElementById(`btn-ota-${c.id}`); let adminSummary = document.getElementById(`admin-summary-${c.id}`);
                    if (btnOta) {
                        if (healthObj && healthObj.agent_update_available) { 
                            btnOta.style.setProperty('border-color', 'var(--danger)', 'important'); 
                            btnOta.style.setProperty('color', 'var(--danger)', 'important'); 
                            if (adminSummary) { adminSummary.innerHTML = "[ SYS_TOOLS (OTA!) ]"; adminSummary.style.color = "var(--danger)"; adminSummary.style.borderColor = "var(--danger)"; }
                        } else { 
                            btnOta.style.setProperty('border-color', 'var(--primary)', 'important'); 
                            btnOta.style.setProperty('color', 'var(--primary)', 'important'); 
                            if (adminSummary) { adminSummary.innerHTML = "[ SYS_TOOLS ]"; adminSummary.style.color = "var(--text-muted)"; adminSummary.style.borderColor = "var(--border-main)"; }
                        }
                    }

                    // --- NESSUN TIMER LOCALE: COMANDA MQTT ---
                    // Memorizza l'ultimo modo dedotto per usarlo durante l'Hangtime o i Beacon
                    if (!isIdle && isOnline) {
                        cardDiv.dataset.lastMode = txModeStr.replace("TX ", "").trim();
                        cardDiv.dataset.lastColor = activeModeColor;
                    }

                    // Se non è in TX e MMDVM NON ha ancora dichiarato 'idle' -> siamo in Hold
                    let isHold = (!isTx && !isIdle && isOnline); 
                    
                    // Salviamo lo stato sul DOM per la mappa
                    cardDiv.dataset.isTx = isTx ? 'true' : 'false';
                    cardDiv.dataset.isHold = isHold ? 'true' : 'false';

                    let holdMode = cardDiv.dataset.lastMode || "DMR";
                    let holdColor = cardDiv.dataset.lastColor || "var(--primary)";

                    let displayState = stateValue; 
                    let statusColor = "";
                    let statusBorder = "";
                    let cBorder = "var(--border-main)";

                    if (!isOnline) {
                        displayState = stateValue;
                        cBorder = "var(--border-light)";
                    } else if (isTx) {
                        displayState = `( ${txModeStr} )`;
                        statusColor = activeModeColor;
                        statusBorder = activeModeColor;
                        cBorder = activeModeColor;
                    } else if (isHold) {
                        displayState = `[ ${holdMode} ]`;
                        statusColor = holdColor;
                        statusBorder = holdColor;
                        cBorder = holdColor;
                    } 
                    
                    if (isOnline) {
                        cardDiv.classList.add('online'); statusDiv.classList.remove('status-offline');
                        cardDiv.style.opacity = "1"; cardDiv.style.filter = "none";
                        
                        cardDiv.style.setProperty('border-top-color', (isTx || isHold) ? statusColor : "var(--border-color)", 'important');
                        if(isTx) {
                            let shadowRGB = '59, 130, 246'; 
                            if (activeModeColor === '#10b981') shadowRGB = '16, 185, 129'; 
                            else if (activeModeColor === '#8b5cf6') shadowRGB = '139, 92, 246'; 
                            else if (activeModeColor === '#06b6d4') shadowRGB = '6, 182, 212'; 
                            else if (activeModeColor === '#f59e0b') shadowRGB = '245, 158, 11'; 
                            cardDiv.style.boxShadow = `0 0 20px rgba(${shadowRGB}, 0.5) !important`;
                        } else { 
                            cardDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2) !important'; 
                        }
                    } else {
                        cardDiv.classList.remove('online'); statusDiv.classList.add('status-offline'); 
                        cardDiv.style.opacity = "0.7"; cardDiv.style.filter = "grayscale(80%)";
                        cardDiv.style.setProperty('border-top-color', '#64748b', 'important'); 
                        cardDiv.style.boxShadow = 'none !important';
                    }
                    
                    cardDiv.style.borderColor = cBorder;
                    if (statusDiv) {
                        statusDiv.innerText = displayState;
                        statusDiv.style.color = statusColor;
                        statusDiv.style.borderColor = statusBorder;
                    }
                    
                    const miniCard = document.getElementById(`mini-card-${c.id}`); 
                    const miniStatus = document.getElementById(`mini-status-${c.id}`); 
                    const miniName = document.getElementById(`mini-name-${c.id}`); 
                    const miniId = document.getElementById(`mini-id-${c.id}`); 
                    const miniCaller = document.getElementById(`mini-caller-${c.id}`); 

                    if (miniCard && miniStatus) {
                        if (genObj && isOnline) { 
                            if(miniName) miniName.innerText = genObj.callsign; 
                            if(miniId) miniId.innerText = `ID:${genObj.radio_id}`; 
                        } 
                        
                        if (isOnline) {
                            miniCard.style.opacity = "1";
                            miniCard.style.filter = "none";
                            
                            if (miniCaller) {
                                let activeCaller = "";
                                if (isTx) {
                                    let rawStr = (telemetryObj.alt && telemetryObj.alt !== "") ? telemetryObj.alt : ((String(telemetryObj.ts1 ?? '').includes("🎙️") || String(telemetryObj.ts1 ?? '').includes("TX")) ? String(telemetryObj.ts1) : String(telemetryObj.ts2 ?? ''));
                                    // Rimuove emoji, prefissi come "D-Star:", "YSF:" e pulisce
                                    let cleaned = rawStr.replace(/[^\x00-\x7F]/g, '') 
                                                        .replace(/(TX)?\s*(D-STAR|YSF|NXDN|P25|DMR|FM|M17)\s*:/ig, '')
                                                        .replace(/TX/ig, '')
                                                        .trim();
                                    if (cleaned) activeCaller = cleaned.split(' ')[0];
                                }
                                
                                if (isTx && activeCaller) {
                                    miniCaller.innerText = activeCaller;
                                    miniCaller.style.display = "block";
                                    miniCaller.style.color = activeModeColor;
                                } else {
                                    miniCaller.style.display = "none";
                                    miniCaller.innerText = "";
                                }
                            }
                            
                            if (warns.length > 0 && !isTx && !isHold) {
                                miniCard.style.borderColor = "var(--accent)";
                                miniStatus.innerText = "(!) ALERT"; 
                                miniStatus.title = warns.join(" | "); 
                                miniStatus.style.color = "var(--accent)"; 
                                miniStatus.style.borderColor = "var(--accent)";
                                miniCard.style.boxShadow = 'none';
                            } else {
                                let mcBorder = "var(--border-main)";
                                let mStatus = stateValue;
                                let mColor = "var(--success)";
                                let mBorderColor = "var(--border-light)";
                                
                                if (isTx) {
                                    mcBorder = activeModeColor;
                                    mStatus = `( ${txModeStr} )`;
                                    mColor = activeModeColor;
                                    mBorderColor = activeModeColor;
                                    miniCard.style.boxShadow = `0 0 12px ${activeModeColor}60`; // GLOW in TX
                                } else if (isHold) {
                                    mcBorder = "var(--border-main)"; // Bordo grigio per non confonderlo con TX
                                    mStatus = `[ ${holdMode} ]`;
                                    mColor = holdColor;               // Solo testo colorato
                                    mBorderColor = "var(--border-light)";
                                    miniCard.style.boxShadow = 'none'; // Nessun glow in hold
                                } else {
                                    miniCard.style.boxShadow = 'none';
                                }
                                
                                miniCard.style.borderColor = mcBorder;
                                miniStatus.innerText = mStatus;
                                miniStatus.title = mStatus;
                                miniStatus.style.color = mColor;
                                miniStatus.style.borderColor = mBorderColor;
                            }
                        } else {
                            miniCard.style.opacity = "0.7";
                            miniCard.style.filter = "grayscale(80%)";
                            miniCard.style.borderColor = "var(--border-light)";
                            miniStatus.innerText = "OFFLINE"; 
                            miniStatus.title = "OFFLINE"; 
                            miniStatus.style.color = "var(--danger)"; 
                            miniStatus.style.borderColor = "var(--border-light)";
                            miniCard.style.boxShadow = 'none';
                        }
                    }

                    if (currentFocusedNode === c.id) {
                        let focusStatus = document.getElementById('focus-status');
                        
                        let fsState = stateValue;
                        let fsColor = isOnline ? 'var(--success)' : 'var(--danger)';
                        
                        if (isOnline) {
                            if (isTx) {
                                fsState = `( ${txModeStr} )`;
                                fsColor = activeModeColor;
                            } else if (isHold) {
                                fsState = `[ ${holdMode} ]`;
                                fsColor = holdColor;
                            }
                        }
                        
                        focusStatus.innerText = fsState;
                        focusStatus.style.color = fsColor;
                        
                        let focusLedColor = isOnline ? (isTx ? activeModeColor : (isHold ? holdColor : 'var(--success)')) : 'var(--border-light)';
                        let focusLedBg = (isOnline && isTx) ? activeModeColor : 'transparent';
                        document.getElementById('focus-name').innerHTML = `<span style="display:inline-block; border-radius:50%; width:20px; height:20px; border:2px solid ${focusLedColor}; background:${focusLedBg}"></span> ${esc(genObj ? genObj.callsign : c.name)}`;
                        
                        document.getElementById('focus-id').innerText = `NET-ID: ${genObj ? genObj.radio_id : c.id.toUpperCase()}`;
                        document.getElementById('focus-cpu').innerText = healthObj && isOnline ? healthObj.cpu + "%" : "--";
                        document.getElementById('focus-temp').innerText = healthObj && isOnline ? healthObj.temp + "°C" : "--";
                        document.getElementById('focus-ram').innerText = healthObj && isOnline ? healthObj.ram + "%" : "--";
                        document.getElementById('focus-disk').innerText = healthObj && isOnline ? healthObj.disk + "%" : "--";
                        document.getElementById('focus-up').innerText = healthObj && isOnline ? fmtAge(healthObj.uptime) : "--";
                        
                        document.getElementById('focus-tx').innerText = infoObj && isOnline ? infoObj.tx : "--";
                        document.getElementById('focus-rx').innerText = infoObj && isOnline ? infoObj.rx : "--";
                        document.getElementById('focus-loc').innerText = infoObj && isOnline ? infoObj.loc : "--";
                        
                        let gwBar = document.getElementById(`gw-bar-${c.id}`);
                        document.getElementById('focus-gw').innerHTML = (gwBar && gwBar.innerHTML) ? gwBar.innerHTML : '<span style="color:var(--border-main); font-family:JetBrains Mono;">NO_ACTIVE_GATEWAYS</span>';
                        
                        let focusTsHtml = "";
                        if (telemetryObj.alt && telemetryObj.alt !== "") {
                            focusTsHtml = `<div style="padding: 10px; border: 1px dashed var(--border-light); color: ${activeModeColor}">${esc(telemetryObj.alt)}</div>`;
                        } else {
                            let isSimplex = (genObj && genObj.duplex === "0");
                            let v1 = String(telemetryObj.ts1 ?? '');
                            let v2 = String(telemetryObj.ts2 ?? '');
                            if(!isSimplex) {
                                focusTsHtml += `<div style="padding: 10px; border: 1px dashed var(--border-light); color: ${v1.includes('🎙️')||v1.includes('TX') ? activeModeColor : 'var(--text-main)'}">TS1: ${esc(v1)}</div>`;
                            }
                            focusTsHtml += `<div style="padding: 10px; border: 1px dashed var(--border-light); color: ${v2.includes('🎙️')||v2.includes('TX') ? activeModeColor : 'var(--text-main)'}">TS2: ${esc(v2)}</div>`;
                        }
                        document.getElementById('focus-ts').innerHTML = focusTsHtml || "--";
                        
                        const modesCard = document.getElementById('focus-modes-card');
                        if (modesCard) {
                            modesCard.style.display = canControl ? 'block' : 'none';
                        }

                        const focusControls = document.getElementById('focus-controls');
                        if (canControl || showReboot) {
                            focusControls.style.display = 'block';
                            let btnHtml = '';
                            if (canControl) {
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto;" onclick="sendTgCommand('${c.id}', 'TG:ON')">[ TG_ON ]</button>`;
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto;" onclick="sendTgCommand('${c.id}', 'TG:OFF')">[ TG_OFF ]</button>`;
                                 if (healthObj && healthObj.profiles) {
                                     const colors = ["var(--accent)", "var(--success)", "var(--primary)"]; let idx = 0;
                                     for (const [pKey, pLabel] of Object.entries(healthObj.profiles)) {
                                         let col = colors[idx % colors.length];
                                         btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: ${col}; color:${col} !important;" onclick="confirmSwitch('${c.id}', ${q(pKey)})">[ ${esc(pLabel)} ]</button>`;
                                         idx++;
                                     }
                                 }
                            }
                            if (showReboot) {
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: var(--primary); color: var(--primary) !important;" onclick="openVersionsModal('${c.id}')">[ INFO ]</button>`;
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: var(--text-main);" onclick="openServicesModal('${c.id}')">[ SVC ]</button>`;
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: var(--accent); color: var(--accent) !important;" onclick="openConfigsModal('${c.id}')">[ CFG ]</button>`;
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: var(--danger); color: var(--danger) !important;" onclick="confirmHatReset('${c.id}')">[ HAT ]</button>`;
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: var(--danger); color: var(--danger) !important;" onclick="confirmReboot('${c.id}')">[ RBT ]</button>`;
                                 let otaColor = (healthObj && healthObj.agent_update_available) ? 'var(--danger)' : 'var(--primary)';
                                 btnHtml += `<button class="btn-cmd" style="padding: 12px 25px; font-size: 1.1rem; flex: none; width: auto; border-color: ${otaColor}; color: ${otaColor} !important;" onclick="confirmUpdateAgent('${c.id}')">[ OTA ]</button>`;
                            }
                            document.getElementById('focus-admin-btns').innerHTML = btnHtml;
                        } else {
                            focusControls.style.display = 'none';
                        }
                    }
                }
                
                globalHealthData[c.id.toLowerCase()] = healthObj;
            } catch(err) { console.error("Error updating state for node", c.id, err); }
        });
        
        applyFilters();
        if (document.getElementById('view-map').style.display === 'block') { initOrUpdateMap(); }
        document.getElementById('last-update').innerText = "SYNC: " + new Date().toLocaleTimeString();
    } catch (e) { console.error(e); }
}

function changeLogLimit(val) {
    localStorage.setItem('fleetLogLimit', val);
    refreshLogs();
}

async function refreshAprs() {
    try {
        const res = await fetch('/api/aprs'); 
        if (!res.ok) return;
        const logs = await res.json();
        const tbody = document.getElementById('aprs-body'); 
        if (!tbody) return;
        let html = "";
        logs.forEach(msg => {
            html += formatAprsRow(msg);
        });
        tbody.innerHTML = html;
    } catch (e) { console.error(e); }
}

function formatAprsRow(msg) {
    const time = msg.time || new Date().toLocaleTimeString('it-IT', { hour12: false });
    const srcHtml = `<a href="https://aprs.fi/info/a/${encodeURIComponent(msg.source)}" target="_blank" style="color: var(--success); text-decoration: none;">${esc(msg.source)}</a>`;
    return `<tr>
        <td style="color:var(--text-muted);">${esc(time)}</td>
        <td style="font-weight:bold;">${srcHtml}</td>
        <td style="color:var(--primary);">${esc(msg.dest)}</td>
        <td style="color:var(--border-main); font-size:0.75rem;">${esc(msg.path)}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${esc(msg.payload)}</td>
    </tr>`;
}

function addLiveAprs(msg) {
    const tbody = document.getElementById('aprs-body');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = formatAprsRow(msg);
    tbody.insertBefore(tr, tbody.firstChild);
    // Limita a 100 righe nel frontend per non appesantire il DOM
    if (tbody.children.length > 100) {
        tbody.removeChild(tbody.lastChild);
    }
}

async function refreshLogs() {
    try {
        const savedLimit = localStorage.getItem('fleetLogLimit') || '';
        const url = savedLimit ? `/api/logs?limit=${encodeURIComponent(savedLimit)}` : '/api/logs';
        const res = await fetch(url); const logs = await res.json();
        const tbody = document.getElementById('log-body'); 
        const focusTbody = document.getElementById('focus-lastheard-body');
        
        let tableHTML = ""; 
        let focusTableHTML = "";
        let networkLogs = {};
        
        logs.forEach(row => {
            const time = row[0] ? row[0].split(' ')[1] : "--:--"; 
            const clientId = String(row[1]).toLowerCase(); 
            const protocol = row[2] || "DMR"; let source = row[3] || "---"; const target = row[4] || "---"; 
            const rawSlot = row[5]; const source_ext = row[8]; const rawRssi = row[9]; const sourceConn = row[10]; const ysfMode = row[11];
            
            let sourceHtml = esc(source);
            if (!source.includes("🌐") && /[a-zA-Z]/.test(source)) {
                 let cleanCall = source.split(' ')[0].trim();
                 sourceHtml = `<a href="https://www.qrz.com/db/${encodeURIComponent(cleanCall)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; text-decoration-color: rgba(255,255,255,0.3); text-underline-offset: 3px; font-weight: inherit;">${esc(source)}</a>`;
            }
            if (source_ext && source_ext.trim() !== "") { sourceHtml += ` <span style="font-size:0.8em; color:var(--text-muted); font-family:'JetBrains Mono', monospace;">/${esc(source_ext)}</span>`; }

            let slotDisplay = rawSlot && String(rawSlot).trim() !== "" && rawSlot !== "undefined" ? (protocol === "DMR" && !String(rawSlot).toUpperCase().startsWith("TS") ? `TS${rawSlot}` : rawSlot) : "---";
            let protoColor = "var(--primary)"; if (protocol === "NXDN") protoColor = "var(--success)"; else if (protocol === "YSF") protoColor = "var(--accent)"; else if (protocol === "D-STAR") protoColor = "var(--primary)"; else if (protocol === "P25") protoColor = "var(--accent)";
            
            let sourceBadge = sourceConn ? (sourceConn.toLowerCase() === 'rf' ? '<span style="color:var(--danger); font-weight:400;">(RF)</span>' : (sourceConn.toLowerCase() === 'network' ? '<span style="color:var(--primary); font-weight:400;">(NET)</span>' : `<span style="font-weight:400; color:var(--text-muted);">(${esc(sourceConn).toUpperCase()})</span>`)) : "---";
            let modeDisplay = ysfMode && ysfMode.trim() !== "" ? `<span style="font-size:0.7rem; color:var(--accent); border: 1px solid var(--accent); padding: 2px 4px;">${esc(ysfMode).toUpperCase()}</span>` : "---";
            
            let rssiDisplay = '---';
            if (rawRssi && rawRssi !== 0) {
                let sLabel = "S0";
                if (rawRssi >= -93) { let over = Math.round((rawRssi + 93) / 10) * 10; sLabel = over > 0 ? `S9+${over}` : "S9"; } 
                else { let sUnits = Math.floor((rawRssi + 141) / 6) + 1; sLabel = `S${Math.max(1, Math.min(9, sUnits))}`; }
                rssiDisplay = `<span title="${esc(rawRssi)} dBm">${sLabel}</span>`;
            }

            if (source.includes("🌐")) {
                if (!networkLogs[clientId]) networkLogs[clientId] = "";
                networkLogs[clientId] += `<div><span style="color:var(--text-muted);">[${esc(time)}]</span> <span style="color:${protoColor};">[${esc(protocol)}]</span> ${esc(source.replace("🌐", "").trim())}</div>`;
            } else {
                const selectedFilter = document.getElementById('stat-node-filter').value;
                
                let rowFull = `<tr>
                        <td data-label="${t('thTime')}">${esc(time)}</td>
                        <td data-label="${t('thRep')}"><b style="color:var(--text-main);">${esc(String(row[1]).toUpperCase())}</b></td>
                        <td data-label="${t('thMode')}"><span style="color:${protoColor}; border:1px solid ${protoColor}; padding:2px 4px;">${esc(protocol)}</span></td>
                        <td data-label="YSF Mode" style="text-align:center;">${modeDisplay}</td>
                        <td data-label="Source" style="text-align:center; font-family:'JetBrains Mono',monospace;">${sourceBadge}</td>
                        <td data-label="REF/SLOT" style="font-family:'JetBrains Mono',monospace; text-align:center;">${esc(slotDisplay)}</td>
                        <td data-label="${t('thCall')}" style="color:var(--text-main); font-weight:400;">${sourceHtml}</td>
                        <td data-label="Target / TG">${esc(target.trim())}</td>
                        <td data-label="${t('thDur')}">${esc(row[6])}s</td>
                        <td data-label="BER">${esc(row[7])}%</td>
                        <td data-label="RSSI" style="font-family:'JetBrains Mono',monospace;">${rssiDisplay}</td>
                    </tr>`;
                
                if (selectedFilter === 'all' || clientId === selectedFilter) {
                    tableHTML += rowFull;
                }
                
                if (currentFocusedNode && clientId === currentFocusedNode.toLowerCase()) {
                    focusTableHTML += rowFull;
                }
            }
        });
        tbody.innerHTML = tableHTML;
        if (focusTbody) focusTbody.innerHTML = focusTableHTML;
        
        clients.forEach(c => { 
            const localDiv = document.getElementById(`sys-log-${c.id}`); 
            if (localDiv && networkLogs[c.id]) { localDiv.innerHTML = networkLogs[c.id]; }
            
            if (currentFocusedNode === c.id) {
                const focusLogDiv = document.getElementById('focus-log');
                if (focusLogDiv && networkLogs[c.id]) focusLogDiv.innerHTML = networkLogs[c.id];
            }
        });
    } catch (e) { console.error(e); }
}

async function refreshStats() {
    try {
        const node = document.getElementById('stat-node-filter').value || 'all';
        const res = await fetch(`/api/stats?node=${node}`); const data = await res.json();
        document.getElementById('stat-tgs').innerHTML = data.top_tgs.map((t, i) => `<div style="border-bottom:1px dashed var(--border-light); padding:2px 0;"><span style="color:var(--text-main);">${i+1}. ${esc(t.target)}</span> <span style="float:right; font-family:'JetBrains Mono',monospace;">[ ${t.count} TX ]</span></div>`).join('') || t('statNoData');
        document.getElementById('stat-calls').innerHTML = data.top_calls.map((c, i) => `<div style="border-bottom:1px dashed var(--border-light); padding:2px 0;"><span style="color:var(--text-main);">${i+1}. ${esc(c.call)}</span> <span style="float:right; font-family:'JetBrains Mono',monospace;">[ ${c.count} TX ]</span></div>`).join('') || t('statNoData');
        document.getElementById('stat-avg').innerText = data.avg_duration; document.getElementById('stat-today').innerText = data.today_tx;
    } catch (e) { console.error(e); }
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { customAlert("ERR", "PUSH UNSUPPORTED", true); return; }
    if (!me.logged_in) { openLoginModal(); return; } 
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { customAlert("ERR", "PERMISSION DENIED", true); return; }
    try {
        const reg = await navigator.serviceWorker.ready; const res = await fetch('/api/vapid_public_key'); const { public_key } = await res.json();
        const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(public_key) });
        const subRes = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
        if (!subRes.ok) throw new Error('ERR HTTP ' + subRes.status);
        customAlert("OK", "PUSH ENABLED"); document.getElementById('push-btn').style.color = 'var(--success)';
    } catch (e) { console.error(e); customAlert("ERR", "PUSH FAIL", true); }
}

async function checkPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try { const reg = await navigator.serviceWorker.ready; const subscription = await reg.pushManager.getSubscription(); const btn = document.getElementById('push-btn'); if (subscription && btn) { btn.style.color = 'var(--success)'; } } catch(e) { console.error(e); }
}

function urlB64ToUint8Array(base64String) { const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/'); const rawData = window.atob(base64); const outputArray = new Uint8Array(rawData.length); for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i); return outputArray; }

async function checkServerUpdate() {
    if (!isAuthenticated || me.role !== 'admin') return;
    try { const res = await fetch('/api/server_update/check'); if (!res.ok) return; const data = await res.json(); const btn = document.getElementById('server-update-btn'); if (btn) { btn.style.display = data.update_available ? 'inline-block' : 'none'; } } catch (e) { console.error(e); }
}

function confirmServerUpdate() {
    customConfirm("UPD_SRV", "EXECUTE GIT PULL ON BACKEND?", "var(--danger)", async () => {
        try { const res = await fetch('/api/server_update/apply', { method: 'POST' }); const data = await res.json(); if (data.success) { customAlert("OK", "UPD EXECUTED. RELOAD IN 5s."); setTimeout(() => location.reload(), 5000); } else { customAlert("ERR", esc(data.error), true); } } catch (e) { console.error(e); customAlert("ERR", "NET ERR", true); }
    });
}

function debounce(fn, ms) { let tm = null; return () => { clearTimeout(tm); tm = setTimeout(fn, ms); }; }
const refreshStatesSoon = debounce(refreshStates, 300); 
const refreshLogsSoon = debounce(() => { refreshLogs(); refreshStats(); }, 500);

if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('mqtt_status', function(data) { const badge = document.getElementById('mqtt-badge'); if (badge) { if (data.connected) { badge.innerText = "MQTT: OK"; badge.className = "mqtt-badge mqtt-online"; } else { badge.innerText = "MQTT: ERR"; badge.className = "mqtt-badge mqtt-offline"; } } });
    socket.on('connect', () => { refreshStates(); refreshLogs(); refreshStats(); });
    socket.on('dati_aggiornati', refreshStatesSoon); 
    socket.on('log_aggiornato', refreshLogsSoon);      
    socket.on('aprs_msg', function(data) { addLiveAprs(data); });
}
