// --- VARIABILI GLOBALI E UI VIEW ---
const HANG_TIME_MS = 3000;
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

function switchView(viewName) {
    document.getElementById('view-home').style.display = 'none';
    document.getElementById('view-nodes').style.display = 'none';
    document.getElementById('view-map').style.display = 'none';
    document.getElementById('tab-home').classList.remove('active');
    document.getElementById('tab-nodes').classList.remove('active');
    document.getElementById('tab-map').classList.remove('active');
    
    document.getElementById(`view-${viewName}`).style.display = 'block';
    document.getElementById(`tab-${viewName}`).classList.add('active');
    localStorage.setItem('fleetDefaultView', viewName);
    
    // Riporta la pagina in cima con un'animazione fluida
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (viewName === 'nodes') { applyViewMode(); }
    else if (viewName === 'map') { 
        setTimeout(() => {
            initOrUpdateMap();
        }, 100);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedView = localStorage.getItem('fleetDefaultView') || 'home';
    switchView(savedView);
    initUI(); 
    checkPushStatus();
    setInterval(refreshStates, 15000); 
    setInterval(() => { refreshLogs(); refreshStats(); }, 60000);
    checkServerUpdate();
    setInterval(checkServerUpdate, 3600000); 
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
        btnToggle.innerText = '📄 LIST';
    } else {
        gridDiv.className = 'grid';
        btnToggle.innerText = '🔲 GRID';
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
    return `<span class="seen-item ${cls}" title="${esc(tip)}">${warn ? '⚠ ' : ''}${label} <b>${txt}</b></span>`;
}

function renderSeen(c, data, isOnline) {
    const div = document.getElementById(`seen-${c.id}`);
    if (!div) return;
    const it = currentLang === 'it';
    const ages = (data.last_seen && data.last_seen[c.id.toLowerCase()]) || {};
    const upSec = data.uptime || 0;
    let html = '';

    const warnM = ages.mmdvm === undefined && isOnline && upSec > 600;
    const tipM = it ? `Ultimo evento dal topic mmdvm/${c.id}/json (TX, cambio modo...). Su un nodo tranquillo può passare molto tempo.`
                    : `Last event from topic mmdvm/${c.id}/json (TX, mode change...). It can be a long time on a quiet node.`;
    const tipMW = it ? `Nessun evento MMDVM ricevuto da quando il server è attivo (${fmtAge(upSec)}): controlla che MMDVMHost sia connesso al broker.`
                     : `No MMDVM event received since the server started (${fmtAge(upSec)}): check that MMDVMHost is connected to the broker.`;
    html += seenItem('MMDVM', ages.mmdvm, warnM ? tipMW : tipM, warnM);

    if (ages.gateway !== undefined) {
        html += seenItem('GW', ages.gateway, it ? 'Ultimo evento dai gateway (DMR/NXDN/YSF/P25/D-Star)' : 'Last event from the gateways (DMR/NXDN/YSF/P25/D-Star)', false);
    }

    const hObj = (data.health && data.health[c.id.toLowerCase()]) || {};
    const iv = Number(hObj.interval) > 0 ? Number(hObj.interval) : 60;
    const warnA = isOnline && (ages.health === undefined ? upSec > Math.max(300, iv * 5) : ages.health > Math.max(180, iv * 3));
    const tipA = warnA
        ? (it ? 'L\'agent del nodo non invia più lo stato (devices/<id>/services): connessione bloccata?' : 'The node agent stopped sending its status (devices/<id>/services): stuck connection?')
        : (it ? 'Ultimo stato ricevuto dall\'agent del nodo (devices/<id>/services)' : 'Last status received from the node agent (devices/<id>/services)');
    html += seenItem('AGENT', ages.health, tipA, warnA);

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
    let profileName = mode === 'A' ? "PROFILE A" : "PROFILE B";
    if (data && data.profiles && data.profiles[mode]) profileName = data.profiles[mode];
    const title = `🔄 ${t('titleSwitch')}`;
    const msg = `${t('confSwitch')} <b>${esc(profileName)}</b> -> <b>${id.toUpperCase()}</b>?`;
    const color = mode === 'A' ? "var(--accent)" : "#eab308";
    sendCommand(id, mode, title, msg, color); 
}

function confirmReboot(id) { sendCommand(id, 'REBOOT', `🔄 ${t('titleBoot')}`, `${t('confBoot')}<b>${id.toUpperCase()}</b>?`, "var(--danger)"); }
function confirmUpdateAgent(id) { sendCommand(id, 'UPDATE_AGENT', `⬇️ UPDATE OTA`, `Confermi l'aggiornamento dello script tramite git pull sul nodo <b>${id.toUpperCase()}</b>?`, "#2563eb"); }    

function sendTgCommand(clientId, comando) {
    const msg = (comando === 'TG:ON') ? t('confTgOn') : t('confTgOff');
    customConfirm("💬 TELEGRAM", `${msg}<b>${clientId.toUpperCase()}</b>?`, "var(--primary)", async () => {
        try {
            const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientId, type: comando }) });
            const data = await res.json();
            if(!data.success) { customAlert(t('titleError'), esc(data.error), true); }
            refreshStates();
        } catch (e) { console.error(e); }
    });
}

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
            let opts = `<option value="all">🌐 ${t('statAllNodes')}</option>`;
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
            let adminBtn = role === 'admin' ? `
                <button id="server-update-btn" onclick="confirmServerUpdate()" class="auth-btn" style="background:var(--danger); color:white !important; display:none; border: 2px solid white; animation: pulse-red 1.5s infinite;" title="Aggiornamento Server Disponibile">🔄 UPDATE SERVER</button>
                <button onclick="sendGlobalUpdate()" class="auth-btn" style="background:#f59e0b; color:white;" data-i18n-title="ttReqCfg" title="${t('ttReqCfg')}">${t('btnReqCfg')}</button>
                <button onclick="triggerGlobalEmergency()" class="auth-btn" style="background:#ef4444; color:white;" data-i18n-title="ttGlobal" title="${t('ttGlobal')}">${t('btnGlobal')}</button>
                <button onclick="openAdmin()" class="auth-btn" style="background:var(--accent); color:white;" data-i18n-title="ttAdmin" title="${t('ttAdmin')}">${t('btnAdmin')}</button>` : '';
            
            authContainer.innerHTML = `${adminBtn}
                                       <span style="font-weight:800; font-size:0.9rem; margin: 0 10px;">👤 ${esc(String(me.user).toUpperCase())}</span>
                                       <button onclick="changeMyPassword()" class="auth-btn" style="background:#64748b; color:white;" data-i18n-title="ttPass" title="${t('ttPass')}">${t('btnPass')}</button>
                                       <button onclick="logout()" class="auth-btn" style="background:var(--text-main); color:var(--card-bg);" data-i18n-title="ttLogout" title="${t('ttLogout')}">${t('btnLogout')}</button>`;
        } else {
            authContainer.innerHTML = `<button onclick="openLoginModal()" class="auth-btn" style="background:var(--primary); color:white; padding: 8px 25px;">LOGIN</button>`;
        }

        grid.innerHTML = clients.map(c => {
            let canControl = isAuthenticated && (role === 'admin' || allowedList.includes('all') || allowedList.includes(c.id.toLowerCase()));
            let showReboot = (role === 'admin'); 

            return `
                <div class="card" id="card-${c.id}" data-status="offline" data-gateways="" data-loc="" data-has-warn="false">
                    <div class="card-header">
                        <span class="client-name" title="${esc(c.name)}">${esc(c.name)}</span>
                        <div class="header-badges">
                            <span class="badge-id">ID: ${c.id.toUpperCase()}</span>
                            <span class="badge-id" id="agent-badge-${c.id}" style="display: none; color: #38bdf8; background: rgba(56, 189, 248, 0.1);"></span>
                            <div id="type-badge-${c.id}" class="type-badge" style="display: none;"></div>
                        </div>
                    </div>
                    
                    <div class="gateway-bar" id="gw-bar-${c.id}"></div>
                    
                    <div class="freq-bar" id="freq-container-${c.id}" style="display: none;">
                        <span><span class="freq-tx">TX:</span> <span id="freq-tx-${c.id}">...</span></span>
                        <span><span class="freq-rx">RX:</span> <span id="freq-rx-${c.id}">...</span></span>
                    </div>
                    <div class="node-meta" id="meta-container-${c.id}" style="display: none;">
                        <span class="node-meta-item">📍 <strong id="loc-${c.id}">...</strong></span>
                        <span class="node-meta-item" style="margin-top: 4px; color: var(--text-muted);">Lat: <span id="lat-${c.id}">...</span> | Lon: <span id="lon-${c.id}">...</span></span>
                    </div>
                    
                    <div class="health-bar" id="health-${c.id}" style="display: none;">
                        <span>⚡ <span id="cpu-${c.id}">--</span>%</span>
                        <span>🌡️ <span id="temp-${c.id}">--</span>°C</span>
                        <span>🧠 <span id="ram-${c.id}">--</span>%</span>
                        <span>💾 <span id="disk-${c.id}">--</span>%</span>
                        <span style="grid-column: span 2;" title="System Uptime">⏱️ <span id="up-${c.id}">--</span></span>
                    </div>
                    
                    <div class="seen-bar" id="seen-${c.id}" style="display: none;"></div>
                    <div class="status-display" id="status-${c.id}">Offline</div>

                    <div id="diag-warn-${c.id}" class="blink" style="display: none; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.8rem; font-weight: bold; color: #fbbf24; line-height: 1.5; text-align: center;"></div>
                    
                    <div id="ts-container-${c.id}" class="ts-container">
                        <div class="dmr-info" id="dmr-ts1-${c.id}">TS1: ...</div>
                        <div class="dmr-info" id="dmr-ts2-${c.id}">TS2: ...</div>
                    </div>
                    <div class="dmr-info" id="dmr-alt-${c.id}" style="display: none; text-align: center; font-weight: 800;"></div>
                    
                    <div class="terminal-log" id="sys-log-${c.id}">${t('waitNet')}</div>

                    <div id="svc-warn-${c.id}" class="blink" style="display: none; text-align: center; margin-bottom: 15px; border-radius: 8px; padding: 10px;">
                        <span style="font-size: 0.85rem;" data-i18n="warnDaemon">${t('warnDaemon')}</span>
                    </div>
                    
                    ${canControl ? `
                    <div id="prof-btns-${c.id}" style="width: 100%; gap: 10px; display: none; margin-bottom: 8px;"></div>
                    <div style="width: 100%; display: flex; gap: 10px; margin-bottom: 8px;">
                        <button class="btn-cmd" style="background: rgba(255, 255, 255, 0.05); color: var(--text-main) !important;" title="${t('ttTgOn')}" onclick="sendTgCommand('${c.id}', 'TG:ON')">🔔 TG ON</button>
                        <button class="btn-cmd" style="background: rgba(255, 255, 255, 0.05); color: var(--text-main) !important;" title="${t('ttTgOff')}" onclick="sendTgCommand('${c.id}', 'TG:OFF')">🔇 TG OFF</button>
                    </div>
                    ` : ''}
                    
                    ${showReboot ? `
                    <details class="admin-dropdown" style="width: 100%;">
                        <summary id="admin-summary-${c.id}" class="btn-cmd" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-muted) !important;">⚙️ Admin Tools</summary>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 10px;">
                            <button class="btn-cmd" style="background: var(--primary); border: none; color: white !important;" title="Versioni Software" onclick="openVersionsModal('${c.id}')">ℹ️ INFO</button>
                            <button id="btn-svc-${c.id}" class="btn-cmd" style="background: #334155; border: none; color: white !important;" title="${t('ttSvc')}" onclick="openServicesModal('${c.id}')">${t('btnSvc')}</button>
                            <button class="btn-cmd" style="background: var(--accent); border: none; color: white !important;" title="${t('ttFile')}" onclick="openConfigsModal('${c.id}')">${t('btnFile')}</button>
                            <button class="btn-cmd" style="background: #ea580c; border: none; color: white !important;" title="${t('ttHat')}" onclick="confirmHatReset('${c.id}')">${t('btnHat')}</button>
                            <button class="btn-cmd" style="background: var(--danger); border: none; color: white !important;" title="${t('ttBoot')}" onclick="confirmReboot('${c.id}')">${t('btnBoot')}</button>
                            <button id="btn-ota-${c.id}" class="btn-cmd" style="background: #2563eb; border: none; color: white !important;" title="Update OTA" onclick="confirmUpdateAgent('${c.id}')">⬇️ OTA</button>
                        </div>
                    </details>
                    ` : ''}
                </div>`;
        }).join('');

        const miniGrid = document.getElementById('home-mini-nodes');
        if (miniGrid) {
            miniGrid.innerHTML = clients.map(c => `
                <div id="mini-card-${c.id}" class="mini-card" onclick="switchView('nodes'); setTimeout(()=>document.getElementById('card-${c.id}').scrollIntoView({behavior:'smooth', block: 'center'}), 200);">
                    <div class="mini-card-content">
                        <div id="mini-name-${c.id}" class="mini-card-name" title="${esc(c.name)}">${esc(c.name)}</div>
                        <div id="mini-id-${c.id}" style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">ID: ${c.id.toUpperCase()}</div>
                    </div>
                    <div id="mini-status-${c.id}" class="mini-card-status" style="color: var(--danger); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);" title="OFFLINE">OFFLINE</div>
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
            attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            className: 'dark-tiles'
        }).addTo(fleetMap);
    } else {
        fleetMap.invalidateSize();
    }

    if (!latestStatesData) return;

    let bounds = [];
    clients.forEach(c => {
        const cid = c.id.toLowerCase();
        const info = latestStatesData.info && latestStatesData.info[cid];
        const gen = latestStatesData.general && latestStatesData.general[cid];
        const state = latestStatesData.states[cid] || "OFFLINE";
        const isOnline = !state.toUpperCase().includes("OFF") && state !== "";
        const health = latestStatesData.health && latestStatesData.health[cid];
        const card = document.getElementById(`card-${c.id}`);
        const isTx = card && card.dataset.lastTx && (Date.now() - parseInt(card.dataset.lastTx) < 3000);
        const warns = (latestStatesData.warnings && latestStatesData.warnings[cid]) || [];

        if (info && info.lat && info.lon && parseFloat(info.lat) !== 0 && parseFloat(info.lon) !== 0) {
            const lat = parseFloat(info.lat);
            const lon = parseFloat(info.lon);
            bounds.push([lat, lon]);

            let pinClass = isOnline ? (warns.length > 0 ? 'pin-warn' : 'pin-online') : 'pin-offline';
            if (isTx) pinClass += ' pin-tx';

            let iconSymbol = (gen && gen.duplex === "0") ? "📻" : "📡";
            if (warns.length > 0 && !isTx) iconSymbol = "⚠️";

            const customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class="custom-map-pin ${pinClass}" style="width: 32px; height: 32px;">${iconSymbol}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const call = (gen && gen.callsign) ? gen.callsign : c.name;
            const warnsHtml = warns.length > 0 ? `
                <div style="background: rgba(245, 158, 11, 0.2); border-left: 3px solid #f59e0b; padding: 4px 8px; margin-bottom: 8px; font-size: 0.75rem; color: #fbbf24; font-weight: bold; border-radius: 4px;">
                    ${warns.map(w => esc(w)).join('<br>')}
                </div>
            ` : '';

            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; min-width: 190px;">
                    <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary); margin-bottom: 4px;">${esc(call)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-bottom: 8px;">ID: ${c.id.toUpperCase()} | ${isOnline ? '<span style="color:var(--success); font-weight:bold;">ONLINE</span>' : '<span style="color:var(--danger); font-weight:bold;">OFFLINE</span>'}</div>
                    ${warnsHtml}
                    <div style="font-size: 0.8rem; margin-bottom: 4px;">📍 <strong>${esc(info.loc)}</strong></div>
                    <div style="font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; color: #f87171;">TX: ${esc(info.tx)}</div>
                    <div style="font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; color: #4ade80; margin-bottom: 6px;">RX: ${esc(info.rx)}</div>
                    ${health ? `<div style="font-size: 0.75rem; margin-bottom: 8px; color: var(--text-muted);">🌡️ Temp: <b>${health.temp}°C</b> | CPU: <b>${health.cpu}%</b></div>` : ''}
                    <button onclick="switchView('nodes'); setTimeout(()=>document.getElementById('card-${c.id}').scrollIntoView({behavior:'smooth', block: 'center'}), 200);" class="btn-cmd" style="background: var(--primary); border:none; width: 100%; padding: 6px; color: white !important;">🔍 Apri Scheda</button>
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
            const statusDiv = document.getElementById(`status-${c.id}`); const cardDiv = document.getElementById(`card-${c.id}`);
            if (!statusDiv || !cardDiv) return;

            let stateValue = data.states[c.id.toLowerCase()] || data.states[c.id] || "OFFLINE";
            stateValue = String(stateValue).trim().toUpperCase(); statusDiv.innerText = stateValue;
            const isOnline = !stateValue.includes("OFF") && stateValue !== "";
            cardDiv.dataset.status = isOnline ? 'online' : 'offline';
            renderSeen(c, data, isOnline);

            const warns = (data.warnings && data.warnings[c.id.toLowerCase()]) || [];
            const diagDiv = document.getElementById(`diag-warn-${c.id}`);
            cardDiv.dataset.hasWarn = (warns.length > 0) ? 'true' : 'false';
            
            if (diagDiv) {
                if (warns.length > 0 && isOnline) {
                    diagDiv.style.display = 'block';
                    diagDiv.innerHTML = warns.map(w => `<div>${esc(w)}</div>`).join('');
                } else {
                    diagDiv.style.display = 'none';
                    diagDiv.innerHTML = '';
                }
            }

            let genObj = data.general && data.general[c.id.toLowerCase()];
            const nameSpan = cardDiv.querySelector('.client-name');
            const idBadge = cardDiv.querySelector('.badge-id');
            const typeBadge = document.getElementById(`type-badge-${c.id}`);

            if (genObj && isOnline) {
                nameSpan.innerText = genObj.callsign;
                idBadge.innerText = `ID: ${genObj.radio_id}`;
                idBadge.style.background = "var(--primary)"; idBadge.style.color = "#ffffff"; idBadge.style.borderColor = "var(--primary)"; 
                
                if (typeBadge && genObj.duplex !== undefined) {
                    typeBadge.style.display = 'inline-block';
                    if (genObj.duplex === "1") { typeBadge.innerText = "REPEATER"; typeBadge.className = "type-badge type-repeater"; } 
                    else { typeBadge.innerText = "HOTSPOT"; typeBadge.className = "type-badge type-hotspot"; }
                }
            } else {
                nameSpan.innerText = c.name;
                idBadge.innerText = `ID: ${c.id.toUpperCase()}`;
                idBadge.style.background = "rgba(255,255,255,0.1)"; idBadge.style.color = "var(--text-muted)"; idBadge.style.borderColor = "var(--border-color)";
                if (typeBadge) typeBadge.style.display = 'none';
            }

            let telemetryObj = data.telemetry[c.id.toLowerCase()] || data.telemetry[c.id] || { ts1: "...", ts2: "...", alt: "", idle: true };
            if (typeof telemetryObj === 'string') telemetryObj = { ts1: telemetryObj, ts2: "...", alt: "", idle: true };

            const tsContainer = document.getElementById(`ts-container-${c.id}`); const ts1Div = document.getElementById(`dmr-ts1-${c.id}`); const ts2Div = document.getElementById(`dmr-ts2-${c.id}`); const altDiv = document.getElementById(`dmr-alt-${c.id}`);
            
            let isTx = false; let activeModeColor = "var(--success)"; let isIdle = telemetryObj.idle === true;

            if (telemetryObj.alt && telemetryObj.alt !== "") {
                if (tsContainer) tsContainer.style.display = "none";
                if (altDiv) {
                    altDiv.style.display = "block"; altDiv.innerText = telemetryObj.alt; let altText = telemetryObj.alt.toUpperCase();
                    
                    if (altText.includes("NXDN")) activeModeColor = "#10b981"; else if (altText.includes("YSF")) activeModeColor = "#8b5cf6"; else if (altText.includes("D-STAR")) activeModeColor = "#06b6d4"; else if (altText.includes("P25")) activeModeColor = "#f59e0b";
                    isTx = altText.includes("🟢") || altText.includes("🟣") || altText.includes("🔵") || altText.includes("🟠");
                    altDiv.style.setProperty('--pulse-color', activeModeColor);
                    if (isTx) { altDiv.classList.add('tx-active-unified'); } else { altDiv.classList.remove('tx-active-unified'); altDiv.style.setProperty('color', 'var(--text-muted)', 'important'); altDiv.style.setProperty('border-left', `4px solid var(--border-color)`, 'important'); }
                }
            } else {
                if (altDiv) altDiv.style.display = "none";
                if (tsContainer) tsContainer.style.display = "flex";
                activeModeColor = "var(--primary)";
                if (ts1Div && ts2Div) {
                    let isSimplex = (genObj && genObj.duplex === "0");
                    ts1Div.style.display = isSimplex ? 'none' : 'block';
                    [ts1Div, ts2Div].forEach((div, idx) => {
                        if (isSimplex && idx === 0) return;
                        const val = String((idx === 0 ? telemetryObj.ts1 : telemetryObj.ts2) ?? '');
                        const fullLabel = `TS${idx + 1}`;
                        div.innerText = `${fullLabel}: ${val}`;
                        div.style.setProperty('--pulse-color', activeModeColor);
                        if (val.includes("🎙️")) { isTx = true; div.classList.add('tx-active-unified'); } 
                        else { div.classList.remove('tx-active-unified'); div.style.setProperty('color', 'var(--text-muted)', 'important'); div.style.setProperty('border-left', '4px solid var(--border-color)', 'important'); }
                    });
                }
            }

            let healthObj = data.health && data.health[c.id.toLowerCase()];
            let infoObj = data.info && data.info[c.id.toLowerCase()];
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
            if (gwBar && healthObj) {
                let gwHtml = "";
                let gwData = data.gateway_states && data.gateway_states[c.id.toLowerCase()] ? data.gateway_states[c.id.toLowerCase()] : {};
                let processes = healthObj.processes || {};
                let activeGatewaysStr = "";
                
                const gwMap = [
                    { id: 'dmrgateway', label: 'DMR', color: '#3b82f6', tint: 'rgba(59, 130, 246, 0.15)', proto: 'DMR' },
                    { id: 'ysfgateway', label: 'YSF', color: '#8b5cf6', tint: 'rgba(139, 92, 246, 0.15)', proto: 'YSF' },
                    { id: 'dstargateway', label: 'D-STAR', color: '#06b6d4', tint: 'rgba(6, 182, 212, 0.15)', proto: 'D-STAR' },
                    { id: 'nxdngateway', label: 'NXDN', color: '#10b981', tint: 'rgba(16, 185, 129, 0.15)', proto: 'NXDN' },
                    { id: 'p25gateway', label: 'P25', color: '#f59e0b', tint: 'rgba(245, 158, 11, 0.15)', proto: 'P25' }
                ];
                
if (isOnline) {
                    gwMap.forEach(gw => {
                        let isActiveProc = processes[gw.id] && processes[gw.id].toLowerCase() === 'online';
                        if (isActiveProc) {
                            activeGatewaysStr += gw.proto.toLowerCase() + ",";
                            let stateInfo = gwData[gw.proto] || { action: 'IDLE', dest: '---' };
                            let action = (stateInfo.action || 'IDLE').toLowerCase();
                            let dest = stateInfo.dest && stateInfo.dest !== '---' && stateInfo.dest.toUpperCase() !== 'IDLE' ? stateInfo.dest : '';
                            
                            let badgeBg, badgeColor, badgeBorder, suffix = '', extraClass = '';
                            
                            if (action === 'linking') {
                                badgeBg = gw.color;
                                badgeColor = 'white';
                                badgeBorder = gw.color;
                                suffix = dest ? `: ${dest} [LINKING]` : ` [LINKING]`;
                            } else if (action === 'linked' || (dest !== '' && action !== 'unlinked' && action !== 'failed' && action !== 'status')) {
                                badgeBg = gw.color;
                                badgeColor = 'white';
                                badgeBorder = gw.color;
                                if (dest) suffix = `: ${dest}`;
                            } else if (action === 'failed') {
                                badgeBg = 'rgba(239, 68, 68, 0.25)';
                                badgeColor = '#fca5a5';
                                badgeBorder = 'var(--danger)';
                                suffix = ' [FAILED]';
                                extraClass = 'blink';
                            } else if (action === 'unlinked') {
                                badgeBg = 'transparent';
                                badgeColor = 'var(--text-muted)';
                                badgeBorder = 'var(--border-color)';
                                suffix = ' [UNLINKED]';
                            } else {
                                badgeBg = gw.tint;
                                badgeColor = gw.color;
                                badgeBorder = gw.color;
                            }
                            
                            if (gw.proto === 'DMR' && gwData['DMR_NETS'] && gwData['DMR_NETS'].length > 0) {
                                gwData['DMR_NETS'].forEach(netName => {
                                    let netSuffix = (action === 'linking') ? ' [LINKING]' : (action === 'failed' ? ' [FAILED]' : (dest && action !== 'status' ? `: ${dest}` : ''));
                                    let netText = `DMR: ${esc(netName)}${esc(netSuffix)}`;
                                    gwHtml += `<span class="${extraClass}" style="font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; font-weight: 800; padding: 3px 6px; border-radius: 4px; border: 1px solid ${badgeBorder}; background: ${badgeBg}; color: ${badgeColor} !important; transition: all 0.3s ease;" title="Stato: ${action.toUpperCase()}">${netText}</span>`;
                                });
                            } else {
                                let text = `${gw.label}${esc(suffix)}`;
                                gwHtml += `<span class="${extraClass}" style="font-size: 0.65rem; font-family: 'JetBrains Mono', monospace; font-weight: 800; padding: 3px 6px; border-radius: 4px; border: 1px solid ${badgeBorder}; background: ${badgeBg}; color: ${badgeColor} !important; transition: all 0.3s ease;" title="Stato: ${action.toUpperCase()}">${text}</span>`;
                            }
                        }
                    });
                }
                cardDiv.dataset.gateways = activeGatewaysStr;
                gwBar.innerHTML = gwHtml;
            } else if (gwBar) {
                gwBar.innerHTML = "";
                cardDiv.dataset.gateways = "";
            }

            if (healthObj && isOnline) {
                healthContainer.style.display = 'flex';
                let cpu = healthObj.cpu; cpuSpan.innerText = cpu; cpuSpan.style.color = cpu < 50 ? 'var(--success)' : (cpu < 80 ? '#f59e0b' : 'var(--danger)');
                let tempVal = healthObj.temp; tempSpan.innerText = tempVal; tempSpan.style.color = tempVal < 55 ? 'var(--success)' : (tempVal < 70 ? '#f59e0b' : 'var(--danger)');
                ramSpan.innerText = healthObj.ram; let d = healthObj.disk; diskSpan.innerText = d; diskSpan.style.color = d < 85 ? 'inherit' : (d < 95 ? '#f59e0b' : 'var(--danger)');
                
                let upSpan = document.getElementById(`up-${c.id}`);
                if (upSpan && healthObj.uptime) { upSpan.innerText = fmtAge(healthObj.uptime); }
                let agentBadge = document.getElementById(`agent-badge-${c.id}`);
                if (agentBadge && healthObj.agent_version) { agentBadge.innerText = `Agent v${healthObj.agent_version}`; agentBadge.style.display = 'inline-block'; }
                
                const profBtnsDiv = document.getElementById(`prof-btns-${c.id}`);
                const profKeys = JSON.stringify(healthObj.profiles || {});
                if (profBtnsDiv && profBtnsDiv.dataset.keys !== profKeys) {
                    profBtnsDiv.dataset.keys = profKeys;
                    if (healthObj.profiles && Object.keys(healthObj.profiles).length > 0) {
                        profBtnsDiv.style.display = 'flex';
                        let html = ''; const colors = ["var(--accent)", "#eab308", "var(--success)", "var(--primary)"]; let idx = 0;
                        for (const [pKey, pLabel] of Object.entries(healthObj.profiles)) {
                            let col = colors[idx % colors.length];
                            html += `<button class="btn-cmd" style="background: ${col}; flex: 1; border: none; color: white !important;" title="${esc(t('ttSwitchTo') + pLabel)}" onclick="confirmSwitch('${c.id}', ${q(pKey)})">${esc(pLabel)}</button>`;
                            idx++;
                        }
                        profBtnsDiv.innerHTML = html;
                    } else { profBtnsDiv.style.display = 'none'; profBtnsDiv.innerHTML = ''; }
                }
            } else { 
                if (healthContainer) healthContainer.style.display = 'none'; 
                let agentBadge = document.getElementById(`agent-badge-${c.id}`);
                if (agentBadge) agentBadge.style.display = 'none';
            }

            globalHealthData[c.id.toLowerCase()] = healthObj;
            
            let hasOfflineService = false;
            if (healthObj && healthObj.processes) {
                for (const [svcName, svcStatus] of Object.entries(healthObj.processes)) { if (svcStatus.toLowerCase() !== 'online') { hasOfflineService = true; break; } }
            }
            const warnBadge = document.getElementById(`svc-warn-${c.id}`); const btnSvc = document.getElementById(`btn-svc-${c.id}`);
            
            if (warnBadge) warnBadge.style.display = hasOfflineService ? 'block' : 'none';
            if (btnSvc) {
                if (hasOfflineService) { btnSvc.style.background = 'var(--danger)'; btnSvc.classList.add('blink'); btnSvc.innerHTML = t('btnSvcKo'); } 
                else { btnSvc.style.background = '#334155'; btnSvc.classList.remove('blink'); btnSvc.innerHTML = t('btnSvc'); }
            }

            let btnOta = document.getElementById(`btn-ota-${c.id}`);
            let adminSummary = document.getElementById(`admin-summary-${c.id}`);
            
            if (btnOta) {
                if (healthObj && healthObj.agent_update_available) { 
                    btnOta.style.setProperty('background', 'var(--danger)', 'important'); 
                    btnOta.style.setProperty('color', 'white', 'important'); 
                    btnOta.style.setProperty('border', '1px solid var(--danger)', 'important'); 
                    btnOta.style.animation = 'danger-glow 1.5s infinite'; 
                    
                    if (adminSummary) {
                        adminSummary.innerHTML = "⚠️ ADMIN (UPDATE OTA!)";
                        adminSummary.style.setProperty('color', 'var(--danger)', 'important');
                        adminSummary.style.setProperty('border-color', 'var(--danger)', 'important');
                        adminSummary.style.animation = 'danger-glow 1.5s infinite';
                    }
                } else { 
                    btnOta.style.setProperty('background', '#2563eb', 'important'); 
                    btnOta.style.setProperty('color', 'white', 'important'); 
                    btnOta.style.setProperty('border', '1px solid transparent', 'important'); 
                    btnOta.style.animation = 'none'; 
                    
                    if (adminSummary) {
                        adminSummary.innerHTML = "⚙️ Admin Tools";
                        adminSummary.style.setProperty('color', 'var(--text-muted)', 'important');
                        adminSummary.style.setProperty('border-color', 'var(--border-color)', 'important');
                        adminSummary.style.animation = 'none';
                    }
                }
            }

            if (isOnline) {
                cardDiv.classList.add('online'); statusDiv.classList.remove('status-offline'); cardDiv.style.opacity = "1"; cardDiv.style.filter = "none";
                if (isTx) cardDiv.dataset.lastTx = Date.now(); 
                let timeSinceTx = Date.now() - (parseInt(cardDiv.dataset.lastTx) || 0);
                let showActiveColor = isTx || (!isIdle && timeSinceTx < HANG_TIME_MS); 
                cardDiv.style.setProperty('border-top-color', showActiveColor ? activeModeColor : "var(--border-color)", 'important');
                if(isTx) {
                    let shadowRGB = '59, 130, 246'; 
                    if (activeModeColor === '#10b981') shadowRGB = '16, 185, 129'; else if (activeModeColor === '#8b5cf6') shadowRGB = '139, 92, 246'; else if (activeModeColor === '#06b6d4') shadowRGB = '6, 182, 212'; else if (activeModeColor === '#f59e0b') shadowRGB = '245, 158, 11'; 
                    cardDiv.style.boxShadow = `0 0 20px rgba(${shadowRGB}, 0.5) !important`;
                } else { cardDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2) !important'; }
            } else {
                cardDiv.classList.remove('online'); statusDiv.classList.add('status-offline'); cardDiv.style.opacity = "0.7"; cardDiv.style.filter = "grayscale(80%)";
                cardDiv.style.setProperty('border-top-color', '#64748b', 'important'); cardDiv.style.boxShadow = 'none !important';
            }

            const miniCard = document.getElementById(`mini-card-${c.id}`);
            const miniStatus = document.getElementById(`mini-status-${c.id}`);
            const miniName = document.getElementById(`mini-name-${c.id}`);
            const miniId = document.getElementById(`mini-id-${c.id}`);
            
            if (miniCard && miniStatus) {
                if (genObj && isOnline) { 
                    if (miniName) miniName.innerText = genObj.callsign; 
                    if (miniId) miniId.innerText = `ID: ${genObj.radio_id}`; 
                } 
                else { 
                    if (miniName) miniName.innerText = c.name; 
                    if (miniId) miniId.innerText = `ID: ${c.id.toUpperCase()}`; 
                }
                
                if (isOnline) {
                    miniCard.style.borderColor = (warns.length > 0) ? "#f59e0b" : "var(--success)";
                    miniCard.style.opacity = "1";
                    miniCard.style.filter = "none";
                    miniStatus.innerText = (warns.length > 0) ? "⚠️ ALERT" : stateValue;
                    miniStatus.title = (warns.length > 0) ? warns.join(" | ") : stateValue; 
                    miniStatus.style.color = (warns.length > 0) ? "#f59e0b" : "var(--success)";
                    miniStatus.style.background = (warns.length > 0) ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.1)";
                    miniStatus.style.borderColor = (warns.length > 0) ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.2)";
                } else {
                    miniCard.style.borderColor = "var(--border-color)";
                    miniCard.style.opacity = "0.6";
                    miniCard.style.filter = "grayscale(80%)";
                    miniStatus.innerText = "OFFLINE";
                    miniStatus.title = "OFFLINE"; 
                    miniStatus.style.color = "var(--danger)";
                    miniStatus.style.background = "rgba(239, 68, 68, 0.1)";
                    miniStatus.style.borderColor = "rgba(239, 68, 68, 0.2)";
                }
            }
        });
        
        applyFilters();
        if (document.getElementById('view-map').style.display === 'block') {
            initOrUpdateMap();
        }
        document.getElementById('last-update').innerText = "Sync: " + new Date().toLocaleTimeString();
    } catch (e) { console.error(e); }
}

function changeLogLimit(val) {
    localStorage.setItem('fleetLogLimit', val);
    refreshLogs();
}

async function refreshLogs() {
    try {
        const savedLimit = localStorage.getItem('fleetLogLimit') || '';
        const url = savedLimit ? `/api/logs?limit=${encodeURIComponent(savedLimit)}` : '/api/logs';
        const res = await fetch(url); const logs = await res.json();
        const tbody = document.getElementById('log-body'); let tableHTML = ""; let networkLogs = {};
            logs.forEach(row => {
            const time = row[0] ? row[0].split(' ')[1] : "--:--"; 
            const clientId = row[1]; const protocol = row[2] || "DMR"; let source = row[3] || "---"; const target = row[4] || "---"; 
            const rawSlot = row[5]; const source_ext = row[8]; const rawRssi = row[9]; const sourceConn = row[10]; const ysfMode = row[11];
            
            let sourceHtml = esc(source);
            if (!source.includes("🌐") && /[a-zA-Z]/.test(source)) {
                 let cleanCall = source.split(' ')[0].trim();
                 sourceHtml = `<a href="https://www.qrz.com/db/${encodeURIComponent(cleanCall)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; text-decoration-color: rgba(255,255,255,0.3); text-underline-offset: 3px; font-weight: inherit;">${esc(source)}</a>`;
            }
            if (source_ext && source_ext.trim() !== "") { sourceHtml += ` <span style="font-size:0.8em; color:var(--text-muted); font-family:'JetBrains Mono', monospace;">/${esc(source_ext)}</span>`; }

            let slotDisplay = rawSlot && String(rawSlot).trim() !== "" && rawSlot !== "undefined" ? (protocol === "DMR" && !String(rawSlot).toUpperCase().startsWith("TS") ? `TS${rawSlot}` : rawSlot) : "---";
            let protoColor = "#3b82f6"; if (protocol === "NXDN") protoColor = "#10b981"; else if (protocol === "YSF") protoColor = "#8b5cf6"; else if (protocol === "D-STAR") protoColor = "#06b6d4"; else if (protocol === "P25") protoColor = "#f59e0b";
            
            let sourceBadge = sourceConn ? (sourceConn.toLowerCase() === 'rf' ? '<span style="color:#f87171; font-weight:800;">RF</span>' : (sourceConn.toLowerCase() === 'network' ? '<span style="color:#38bdf8; font-weight:800;">NET</span>' : `<span style="font-weight:800; color:var(--text-muted);">${esc(sourceConn).toUpperCase()}</span>`)) : "---";
            let modeDisplay = ysfMode && ysfMode.trim() !== "" ? `<span style="font-size:0.7rem; color:var(--accent); border: 1px solid var(--accent); padding: 2px 4px; border-radius: 4px;">${esc(ysfMode).toUpperCase()}</span>` : "---";
            
            let rssiDisplay = '---';
            if (rawRssi && rawRssi !== 0) {
                let sLabel = "S0";
                if (rawRssi >= -93) {
                    let over = Math.round((rawRssi + 93) / 10) * 10;
                    sLabel = over > 0 ? `S9<sup style="color: var(--danger); font-weight: 800;">+${over}</sup>` : "S9";
                } else {
                    let sUnits = Math.floor((rawRssi + 141) / 6) + 1;
                    sLabel = `S${Math.max(1, Math.min(9, sUnits))}`;
                }
                let activeSegs = 1;
                if (rawRssi >= -53) activeSegs = 9; else if (rawRssi >= -63) activeSegs = 8; else if (rawRssi >= -73) activeSegs = 7; else if (rawRssi >= -83) activeSegs = 6; else if (rawRssi >= -93) activeSegs = 5; else if (rawRssi >= -105) activeSegs = 4; else if (rawRssi >= -117) activeSegs = 3; else if (rawRssi >= -129) activeSegs = 2;
                let barsHtml = ''; const heights = [4, 5, 6, 7, 8, 10, 12, 14, 14];
                for (let i = 0; i < 9; i++) {
                    let color = "rgba(255,255,255,0.1)"; 
                    if (i < activeSegs) { if (i < 5) color = "var(--success)"; else if (i < 7) color = "#f59e0b"; else color = "var(--danger)"; }
                    barsHtml += `<div style="width: 4px; height: ${heights[i]}px; background: ${color}; border-radius: 1px;"></div>`;
                }
                rssiDisplay = `<div style="display: flex; align-items: center; gap: 10px;" title="${esc(rawRssi)} dBm"><div style="min-width: 40px; text-align: right; font-weight: bold; font-family: 'Inter', sans-serif;">${sLabel}</div><div style="display: flex; align-items: flex-end; gap: 2px; height: 14px;">${barsHtml}</div><span style="font-size: 0.85em; color: var(--text-muted); min-width: 7ch; text-align: right;">${esc(rawRssi)} dBm</span></div>`;
            }

            if (source.includes("🌐")) {
                if (!networkLogs[clientId]) networkLogs[clientId] = "";
                networkLogs[clientId] += `<div style="border-bottom:1px solid rgba(255,255,255,0.05); padding:4px 0;"><span style="color:var(--text-muted);">[${esc(time)}]</span> <span style="color:${protoColor}; font-weight:bold;">[${esc(protocol)}]</span> <span style="color:var(--text-main);">${esc(source.replace("🌐", "").trim())}</span></div>`;
            } else {
                const selectedFilter = document.getElementById('stat-node-filter').value;
                if (selectedFilter === 'all' || String(clientId).toLowerCase() === selectedFilter) {
                    tableHTML += `<tr>
                        <td data-label="${t('thTime')}">${esc(time)}</td>
                        <td data-label="${t('thRep')}"><b style="color:var(--text-main);">${esc(String(clientId).toUpperCase())}</b></td>
                        <td data-label="${t('thMode')}"><span style="background:${protoColor}; color:white; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:800;">${esc(protocol)}</span></td>
                        <td data-label="YSF Mode" style="text-align:center;">${modeDisplay}</td>
                        <td data-label="Source" style="text-align:center; font-family:'JetBrains Mono', monospace;">${sourceBadge}</td>
                        <td data-label="REF/SLOT" style="font-family:'JetBrains Mono', monospace; font-weight:bold; text-align:center;">${esc(slotDisplay)}</td>
                        <td data-label="${t('thCall')}" style="color:var(--accent); font-weight:800;">${sourceHtml}</td>
                        <td data-label="Target / TG" style="font-family:'JetBrains Mono', monospace;">${esc(target.trim())}</td>
                        <td data-label="${t('thDur')}">${esc(row[6])}s</td>
                        <td data-label="BER">${esc(row[7])}%</td>
                        <td data-label="RSSI" style="font-family:'JetBrains Mono', monospace;">${rssiDisplay}</td>
                    </tr>`;
                }
            }
        });
        tbody.innerHTML = tableHTML;
        clients.forEach(c => { const localDiv = document.getElementById(`sys-log-${c.id}`); if (localDiv && networkLogs[c.id]) { localDiv.innerHTML = networkLogs[c.id]; } });
    } catch (e) { console.error(e); }
}

async function refreshStats() {
    try {
        const node = document.getElementById('stat-node-filter').value || 'all';
        const res = await fetch(`/api/stats?node=${node}`); const data = await res.json();
        document.getElementById('stat-tgs').innerHTML = data.top_tgs.map((t, i) => `<div><b style="color:var(--text-main);">${i+1}. ${esc(t.target)}</b> <span style="float:right; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${t.count} tx</span></div>`).join('') || t('statNoData');
        document.getElementById('stat-calls').innerHTML = data.top_calls.map((c, i) => `<div><b style="color:var(--text-main);">${i+1}. ${esc(c.call)}</b> <span style="float:right; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${c.count} tx</span></div>`).join('') || t('statNoData');
        document.getElementById('stat-avg').innerText = data.avg_duration; document.getElementById('stat-today').innerText = data.today_tx;
    } catch (e) { console.error("Errore statistiche:", e); }
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { customAlert("Error", "Push notifications are not supported by this browser.", true); return; }
    if (!me.logged_in) { openLoginModal(); return; } 
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { customAlert("Error", "Push notifications permission denied.", true); return; }
    try {
        const reg = await navigator.serviceWorker.ready; const res = await fetch('/api/vapid_public_key'); const { public_key } = await res.json();
        const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(public_key) });
        const subRes = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) });
        if (!subRes.ok) throw new Error('subscribe failed: HTTP ' + subRes.status);
        customAlert("Success", "Push notifications enabled successfully!"); document.getElementById('push-btn').style.color = 'var(--success)';
    } catch (e) { console.error(e); customAlert("Error", "Failed to enable notifications.", true); }
}

async function checkPushStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try { const reg = await navigator.serviceWorker.ready; const subscription = await reg.pushManager.getSubscription(); const btn = document.getElementById('push-btn'); if (subscription && btn) { btn.style.color = 'var(--success)'; } } catch(e) { console.error(e); }
}

function urlB64ToUint8Array(base64String) { const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/'); const rawData = window.atob(base64); const outputArray = new Uint8Array(rawData.length); for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i); return outputArray; }

async function checkServerUpdate() {
    if (!isAuthenticated || me.role !== 'admin') return;
    try { const res = await fetch('/api/server_update/check'); const data = await res.json(); const btn = document.getElementById('server-update-btn'); if (btn) { btn.style.display = data.update_available ? 'inline-block' : 'none'; } } catch (e) { console.error(e); }
}

function confirmServerUpdate() {
    customConfirm("🔄 UPDATE SERVER", "Vuoi scaricare l'ultima versione del server da Gitea/GitHub e riavviare il servizio backend?", "var(--danger)", async () => {
        try { const res = await fetch('/api/server_update/apply', { method: 'POST' }); const data = await res.json(); if (data.success) { customAlert("✅ SUCCESS", "Aggiornamento in corso. La pagina si ricaricherà a breve."); setTimeout(() => location.reload(), 5000); } else { customAlert("❌ ERRORE", esc(data.error), true); } } catch (e) { console.error(e); customAlert("❌ ERRORE", "Errore di rete.", true); }
    });
}

function debounce(fn, ms) { let tm = null; return () => { clearTimeout(tm); tm = setTimeout(fn, ms); }; }
const refreshStatesSoon = debounce(refreshStates, 300); 
const refreshLogsSoon = debounce(() => { refreshLogs(); refreshStats(); }, 500);

if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('mqtt_status', function(data) { const badge = document.getElementById('mqtt-badge'); if (badge) { if (data.connected) { badge.innerText = "MQTT: ONLINE"; badge.className = "mqtt-badge mqtt-online"; } else { badge.innerText = "MQTT: OFFLINE"; badge.className = "mqtt-badge mqtt-offline"; } } });
    socket.on('connect', () => { refreshStates(); refreshLogs(); refreshStats(); });
    socket.on('dati_aggiornati', refreshStatesSoon); socket.on('log_aggiornato', refreshLogsSoon);      
}
