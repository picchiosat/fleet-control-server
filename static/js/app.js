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
        btnToggle.innerText = '[ LIST ]';
    } else {
        gridDiv.className = 'grid';
        btnToggle.innerText = '[ GRID ]';
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
    const title = `🔄 ${t('titleSwitch')}`;
    const msg = `${t('confSwitch')} <b>${esc(profileName)}</b> -> <b>${id.toUpperCase()}</b>?`;
    const color = mode === 'A' ? "var(--accent)" : "var(--primary)";
    sendCommand(id, mode, title, msg, color); 
}

function confirmReboot(id) { sendCommand(id, 'REBOOT', `🔄 ${t('titleBoot')}`, `${t('confBoot')}<b>${id.toUpperCase()}</b>?`, "var(--danger)"); }
function confirmUpdateAgent(id) { sendCommand(id, 'UPDATE_AGENT', `⬇️ UPDATE OTA`, `Confermi l'aggiornamento dello script tramite git pull sul nodo <b>${id.toUpperCase()}</b>?`, "var(--primary)"); }    

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
            let adminBtn = role === 'admin' ? `
                <button id="server-update-btn" onclick="confirmServerUpdate()" class="auth-btn" style="border-color:var(--danger); color:var(--danger) !important; display:none;" title="Aggiornamento Server Disponibile">[ UPD_SERVER ]</button>
                <button onclick="sendGlobalUpdate()" class="auth-btn" style="color:var(--accent);" data-i18n-title="ttReqCfg" title="${t('ttReqCfg')}">[ ${t('btnReqCfg')} ]</button>
                <button onclick="triggerGlobalEmergency()" class="auth-btn" style="color:var(--danger);" data-i18n-title="ttGlobal" title="${t('ttGlobal')}">[ ${t('btnGlobal')} ]</button>
                <button onclick="openAdmin()" class="auth-btn" style="color:var(--primary);" data-i18n-title="ttAdmin" title="${t('ttAdmin')}">[ ${t('btnAdmin')} ]</button>` : '';
            
            authContainer.innerHTML = `${adminBtn}
                                       <span style="font-weight:300; font-size:0.85rem; margin: 0 10px; font-family:'JetBrains Mono', monospace; color:var(--primary);">USR: ${esc(String(me.user).toUpperCase())}</span>
                                       <button onclick="changeMyPassword()" class="auth-btn" data-i18n-title="ttPass" title="${t('ttPass')}">[ ${t('btnPass')} ]</button>
                                       <button onclick="logout()" class="auth-btn" data-i18n-title="ttLogout" title="${t('ttLogout')}">[ ${t('btnLogout')} ]</button>`;
        } else {
            authContainer.innerHTML = `<button onclick="openLoginModal()" class="auth-btn" style="color:var(--success);">[ AUTH ]</button>`;
        }

        grid.innerHTML = clients.map(c => {
            let canControl = isAuthenticated && (role === 'admin' || allowedList.includes('all') || allowedList.includes(c.id.toLowerCase()));
            let showReboot = (role === 'admin'); 

            return `
                <div class="card" id="card-${c.id}" data-status="offline" data-gateways="" data-loc="" data-has-warn="false">
                    <div class="card-header">
                        <span class="client-name" title="${esc(c.name)}">${esc(c.name)}</span>
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
                    
                    <div class="terminal-log" id="sys-log-${c.id}">${t('waitNet')}</div>

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
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-top: 10px;">
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
                <div id="mini-card-${c.id}" class="mini-card" onclick="switchView('nodes'); setTimeout(()=>document.getElementById('card-${c.id}').scrollIntoView({behavior:'smooth', block: 'center'}), 200);">
                    <div class="mini-card-content">
                        <div id="mini-name-${c.id}" class="mini-card-name" title="${esc(c.name)}">${esc(c.name)}</div>
                        <div id="mini-id-${c.id}" style="font-family: 'JetBrains Mono', monospace; font-size: 0.65rem; color: var(--text-muted); margin-top: 2px;">ID: ${c.id.toUpperCase()}</div>
                    </div>
                    <div id="mini-status-${c.id}" class="mini-card-status" title="OFFLINE">OFFLINE</div>
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
                    <button onclick="switchView('nodes'); setTimeout(()=>document.getElementById('card-${c.id}').scrollIntoView({behavior:'smooth', block: 'center'}), 200);" class="btn-cmd" style="width: 100%; margin-top:5px;">[ FOCUS_NODE ]</button>
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
                    diagDiv.innerHTML = warns.map(w => `<div>[!] ${esc(w)}</div>`).join('');
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

            let telemetryObj = data.telemetry[c.id.toLowerCase()] || data.telemetry[c.id] || { ts1: "...", ts2: "...", alt: "", idle: true };
            if (typeof telemetryObj === 'string') telemetryObj = { ts1: telemetryObj, ts2: "...", alt: "", idle: true };

            const tsContainer = document.getElementById(`ts-container-${c.id}`); const ts1Div = document.getElementById(`dmr-ts1-${c.id}`); const ts2Div = document.getElementById(`dmr-ts2-${c.id}`); const altDiv = document.getElementById(`dmr-alt-${c.id}`);
            let isTx = false; let activeModeColor = "var(--success)"; let isIdle = telemetryObj.idle === true;

            if (telemetryObj.alt && telemetryObj.alt !== "") {
                if (tsContainer) tsContainer.style.display = "none";
                if (altDiv) {
                    altDiv.style.display = "block"; altDiv.innerText = telemetryObj.alt; let altText = telemetryObj.alt.toUpperCase();
                    if (altText.includes("NXDN")) activeModeColor = "var(--success)"; else if (altText.includes("YSF")) activeModeColor = "var(--primary)"; else if (altText.includes("D-STAR")) activeModeColor = "var(--primary)"; else if (altText.includes("P25")) activeModeColor = "var(--accent)";
                    isTx = altText.includes("🟢") || altText.includes("🟣") || altText.includes("🔵") || altText.includes("🟠");
                    if (isTx) { altDiv.style.color = activeModeColor; altDiv.style.borderColor = activeModeColor; } 
                    else { altDiv.style.color = "var(--text-muted)"; altDiv.style.borderColor = "var(--border-light)"; }
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
                        div.innerText = `TS${idx + 1}: ${val}`;
                        if (val.includes("🎙️") || val.includes("TX")) { isTx = true; div.style.color = activeModeColor; div.style.borderColor = activeModeColor; } 
                        else { div.style.color = "var(--text-muted)"; div.style.borderColor = "var(--border-light)"; }
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
                let gwHtml = ""; let gwData = data.gateway_states && data.gateway_states[c.id.toLowerCase()] ? data.gateway_states[c.id.toLowerCase()] : {}; let processes = healthObj.processes || {}; let activeGatewaysStr = "";
                const gwMap = [{ id: 'dmrgateway', label: 'DMR', color: 'var(--primary)', proto: 'DMR' }, { id: 'ysfgateway', label: 'YSF', color: '#8b5cf6', proto: 'YSF' }, { id: 'dstargateway', label: 'D-STAR', color: 'var(--primary)', proto: 'D-STAR' }, { id: 'nxdngateway', label: 'NXDN', color: 'var(--success)', proto: 'NXDN' }, { id: 'p25gateway', label: 'P25', color: 'var(--accent)', proto: 'P25' }];
                
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
                            
                            if (gw.proto === 'DMR' && gwData['DMR_NETS'] && gwData['DMR_NETS'].length > 0) {
                                gwData['DMR_NETS'].forEach(netName => { let netSuffix = (action === 'linking') ? ' [LNK]' : (action === 'failed' ? ' [ERR]' : (dest && action !== 'status' ? `:${dest}` : '')); gwHtml += `<span style="font-size:0.65rem; font-family:'JetBrains Mono', monospace; font-weight:400; padding:2px 4px; border:1px dashed ${badgeBorder}; background:transparent; color:${badgeColor} !important; margin-right: 4px; display: inline-block;">DMR:${esc(netName)}${esc(netSuffix)}</span>`; });
                            } else { gwHtml += `<span style="font-size:0.65rem; font-family:'JetBrains Mono', monospace; font-weight:400; padding:2px 4px; border:1px dashed ${badgeBorder}; background:transparent; color:${badgeColor} !important; margin-right: 4px; display: inline-block;">${gw.label}${esc(suffix)}</span>`; }
                        }
                    });
                }
                cardDiv.dataset.gateways = activeGatewaysStr; gwBar.innerHTML = gwHtml;
            } else if (gwBar) { gwBar.innerHTML = ""; cardDiv.dataset.gateways = ""; }

            if (healthObj && isOnline) {
                healthContainer.style.display = 'grid';
                cpuSpan.innerText = healthObj.cpu; tempSpan.innerText = healthObj.temp; ramSpan.innerText = healthObj.ram; diskSpan.innerText = healthObj.disk;
                let upSpan = document.getElementById(`up-${c.id}`); if (upSpan && healthObj.uptime) { upSpan.innerText = fmtAge(healthObj.uptime); }
                let agentBadge = document.getElementById(`agent-badge-${c.id}`); if (agentBadge && healthObj.agent_version) { agentBadge.innerText = `AGT:v${healthObj.agent_version}`; agentBadge.style.display = 'inline-block'; }
                
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
                let agentBadge = document.getElementById(`agent-badge-${c.id}`); if (agentBadge) agentBadge.style.display = 'none';
            }

            globalHealthData[c.id.toLowerCase()] = healthObj;
            
            let hasOfflineService = false;
            if (healthObj && healthObj.processes) { for (const [svcName, svcStatus] of Object.entries(healthObj.processes)) { if (svcStatus.toLowerCase() !== 'online') { hasOfflineService = true; break; } } }
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

            if (isOnline) {
                cardDiv.classList.add('online'); statusDiv.classList.remove('status-offline');
                if (isTx) cardDiv.dataset.lastTx = Date.now(); 
                let timeSinceTx = Date.now() - (parseInt(cardDiv.dataset.lastTx) || 0);
                let showActiveColor = isTx || (!isIdle && timeSinceTx < HANG_TIME_MS); 
                
                if (showActiveColor) { cardDiv.style.borderColor = activeModeColor; }
                else { cardDiv.style.borderColor = "var(--border-main)"; }
            } else {
                cardDiv.classList.remove('online'); statusDiv.classList.add('status-offline');
                cardDiv.style.borderColor = "var(--border-light)";
            }

            const miniCard = document.getElementById(`mini-card-${c.id}`); const miniStatus = document.getElementById(`mini-status-${c.id}`); const miniName = document.getElementById(`mini-name-${c.id}`); const miniId = document.getElementById(`mini-id-${c.id}`);
            if (miniCard && miniStatus) {
                if (genObj && isOnline) { if (miniName) miniName.innerText = genObj.callsign; if (miniId) miniId.innerText = `ID:${genObj.radio_id}`; } 
                else { if (miniName) miniName.innerText = c.name; if (miniId) miniId.innerText = `ID:${c.id.toUpperCase()}`; }
                
                if (isOnline) {
                    let timeSinceTx = Date.now() - (parseInt(cardDiv.dataset.lastTx) || 0);
                    let showActiveColor = isTx || (!isIdle && timeSinceTx < HANG_TIME_MS);
                    if (showActiveColor) {
                        miniCard.style.borderColor = activeModeColor;
                        miniStatus.innerText = "( TX )"; miniStatus.title = "Transmitting..."; miniStatus.style.color = activeModeColor; miniStatus.style.borderColor = activeModeColor;
                    } else if (warns.length > 0) {
                        miniCard.style.borderColor = "var(--accent)";
                        miniStatus.innerText = "(!) ALERT"; miniStatus.title = warns.join(" | "); miniStatus.style.color = "var(--accent)"; miniStatus.style.borderColor = "var(--accent)";
                    } else {
                        miniCard.style.borderColor = "var(--border-main)";
                        miniStatus.innerText = stateValue; miniStatus.title = stateValue; miniStatus.style.color = "var(--success)"; miniStatus.style.borderColor = "var(--border-light)";
                    }
                } else {
                    miniCard.style.borderColor = "var(--border-light)";
                    miniStatus.innerText = "OFFLINE"; miniStatus.title = "OFFLINE"; miniStatus.style.color = "var(--danger)"; miniStatus.style.borderColor = "var(--border-light)";
                }
            }
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
                if (selectedFilter === 'all' || String(clientId).toLowerCase() === selectedFilter) {
                    tableHTML += `<tr>
                        <td data-label="${t('thTime')}">${esc(time)}</td>
                        <td data-label="${t('thRep')}"><b style="color:var(--text-main);">${esc(String(clientId).toUpperCase())}</b></td>
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
    try { const res = await fetch('/api/server_update/check'); const data = await res.json(); const btn = document.getElementById('server-update-btn'); if (btn) { btn.style.display = data.update_available ? 'inline-block' : 'none'; } } catch (e) { console.error(e); }
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
    socket.on('dati_aggiornati', refreshStatesSoon); socket.on('log_aggiornato', refreshLogsSoon);      
}
