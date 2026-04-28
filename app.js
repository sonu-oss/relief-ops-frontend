// ── Geoapify Map Config ─────────────────────────────────
const GEOAPIFY_KEY = '752592b5a3014bc0b2e46e3b9cb2c34e'; // Replace with your Geoapify API key
let createMap = null;
let createMarker = null;
let viewMap = null;
let viewMarker = null;
let selectedTaskLat = 12.9716;
let selectedTaskLng = 77.5946;
let selectedTaskAddress = '';
let searchTimeout = null;

function initCreateMap() {
    if (!createMap) {
    createMap = L.map('task-map').setView([12.9716, 77.5946], 13);
    L.tileLayer(`https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`, {
        attribution: '© Geoapify © OpenStreetMap',
        maxZoom: 20
    }).addTo(createMap);

    createMarker = L.marker([12.9716, 77.5946], { draggable: true }).addTo(createMap);

    createMap.on('click', (e) => {
        createMarker.setLatLng(e.latlng);
        geocodeReverse(e.latlng.lat, e.latlng.lng);
    });
    createMarker.on('dragend', () => {
        const pos = createMarker.getLatLng();
        geocodeReverse(pos.lat, pos.lng);
    });
    }
}

async function geocodeReverse(lat, lng) {
    selectedTaskLat = lat;
    selectedTaskLng = lng;
    try {
    const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${GEOAPIFY_KEY}`);
    const data = await res.json();
    if (data.features && data.features.length > 0) {
        selectedTaskAddress = data.features[0].properties.formatted;
        document.getElementById('address-display').innerHTML = `📍 ${selectedTaskAddress}`;
    } else {
        document.getElementById('address-display').innerHTML = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        selectedTaskAddress = '';
    }
    } catch (err) {
    console.error(err);
    }
}

document.getElementById('location-search').addEventListener('input', (e) => {
    const query = e.target.value;
    clearTimeout(searchTimeout);
    if (!query) {
    document.getElementById('suggestions').style.display = 'none';
    return;
    }
    searchTimeout = setTimeout(async () => {
    try {
        const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_KEY}&limit=5`);
        const data = await res.json();
        const sugDiv = document.getElementById('suggestions');
        sugDiv.innerHTML = '';
        if (data.features && data.features.length > 0) {
        data.features.forEach(f => {
            const div = document.createElement('div');
            div.style.padding = '8px 12px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid var(--border2)';
            div.style.fontSize = '12px';
            div.textContent = f.properties.formatted;
            div.onclick = () => {
            const lat = f.properties.lat;
            const lon = f.properties.lon;
            createMap.setView([lat, lon], 16);
            createMarker.setLatLng([lat, lon]);
            geocodeReverse(lat, lon);
            sugDiv.style.display = 'none';
            document.getElementById('location-search').value = f.properties.formatted;
            };
            sugDiv.appendChild(div);
        });
        sugDiv.style.display = 'block';
        } else {
        sugDiv.style.display = 'none';
        }
    } catch (err) {
        console.error(err);
    }
    }, 400);
});

function openViewLocationModal(lat, lng, address) {
    document.getElementById('view-location-modal').classList.add('open');
    document.getElementById('view-address').textContent = address || `Coordinates: ${lat}, ${lng}`;
    document.getElementById('google-maps-link').href = `https://www.google.com/maps?q=${lat},${lng}`;

    setTimeout(() => {
    if (!viewMap) {
        viewMap = L.map('view-map').setView([lat, lng], 15);
        L.tileLayer(`https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`, {
        attribution: '© Geoapify © OpenStreetMap',
        maxZoom: 20
        }).addTo(viewMap);

        const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
        });
        viewMarker = L.marker([lat, lng], { icon: redIcon }).addTo(viewMap);
        viewMarker.bindPopup(`<b>${address || 'Location'}</b>`).openPopup();
    } else {
        viewMap.invalidateSize();
        viewMap.setView([lat, lng], 15);
        viewMarker.setLatLng([lat, lng]);
        viewMarker.setPopupContent(`<b>${address || 'Location'}</b>`).openPopup();
    }
    }, 350);
}
// ── Config ──────────────────────────────────────────────
const API = 'https://reliefops-backend-480788467686.asia-south1.run.app';
let ws = null;
let allNgos = [];
let allTasks = [];
let allVolunteers = [];
let currentFilter = 'all';
let authMode = 'signup';
let selectedRole = 'ngo';
let currentRole = null;
let currentNgoId = null;
let loggedInVolunteerId = null;
let currentUserEmail = null;
let currentVolunteerView = 'task';
let volunteerActivityLog = [];
let dismissedSuggestionIds = [];
const SKILL_OPTIONS = [
    { value: 'first_aid', label: 'First Aid' },
    { value: 'driving', label: 'Driving' },
    { value: 'rescue', label: 'Rescue' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'communication', label: 'Communication' },
    { value: 'counseling', label: 'Counseling' }
];

// All data starts empty and lives only in JS memory for this prototype.

// ── Utilities ────────────────────────────────────────────
function saveState() {
    localStorage.setItem('reliefOpsState', JSON.stringify({
    allNgos,
    allTasks,
    allVolunteers,
    volunteerActivityLog
    }));
}

function loadState() {
    const raw = localStorage.getItem('reliefOpsState');
    if (!raw) return;
    try {
    const data = JSON.parse(raw);
    allNgos = data.allNgos || [];
    allTasks = data.allTasks || [];
    allVolunteers = data.allVolunteers || [];
    volunteerActivityLog = data.volunteerActivityLog || [];
    } catch {
    allNgos = [];
    allTasks = [];
    allVolunteers = [];
    volunteerActivityLog = [];
    }
}

function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${type === 'success' ? '✓' : '⚠'}</span> ${msg}`;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function priorityClass(score) {
    if (score >= 150) return 'critical';
    if (score >= 100) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
}
function priorityLabel(score) {
    if (score >= 150) return 'Critical';
    if (score >= 100) return 'High';
    if (score >= 50) return 'Medium';
    return 'Low';
}

function updatePriorityScore(task) {
    let unassignedCount = allVolunteers.filter(v => v.available && v.skills.split(',').includes(task.required_skill)).length;
    let scarcityBonus = 0;
    if (unassignedCount < 2) scarcityBonus = 30;
    else if (unassignedCount >= 2 && unassignedCount <= 4) scarcityBonus = 15;

    let hoursUnassigned = 0;
    if (!task.assigned_to) {
    hoursUnassigned = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);
    }

    const urgencyPts = task.urgency * 20;
    const livesPts = Math.min(task.lives_at_risk * 1.5, 150);
    const decayPts = Math.floor(hoursUnassigned * 2);

    task.priority_score = urgencyPts + livesPts + scarcityBonus - decayPts;
    task.score_breakdown = `Score: ${task.priority_score.toFixed(0)} | Urgency: ${urgencyPts} pts | Lives: ${livesPts} pts | Scarcity: +${scarcityBonus} | Decay: -${decayPts} pts`;
}

const AVATARS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
const SKILL_EMOJI = { first_aid: '🩺', driving: '🚗', rescue: '⛑', logistics: '📦', communication: '📡', counseling: '💬' };

function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.role === role);
    });
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-email').placeholder = role === 'ngo' ? 'ngo@example.org' : 'volunteer@example.org';
    document.getElementById('login-name').placeholder = role === 'ngo' ? 'Organization or coordinator name' : 'Volunteer name';
    document.getElementById('volunteer-skills-row').classList.toggle('hidden', role !== 'volunteer' || authMode === 'login');
}

function setAuthMode(mode) {
    authMode = mode;
    document.getElementById('signup-tab').classList.toggle('active', mode === 'signup');
    document.getElementById('login-tab').classList.toggle('active', mode === 'login');
    document.getElementById('auth-submit').textContent = mode === 'signup' ? 'Signup' : 'Login';
    document.getElementById('auth-subtitle').textContent = mode === 'signup'
    ? 'Create an account to start saving your session'
    : 'Existing users can enter name and password';
    document.getElementById('login-email-row').classList.toggle('hidden', mode === 'login');
    document.getElementById('login-name-label').textContent = selectedRole === 'ngo' ? 'NGO name' : 'Volunteer name';
    selectRole(selectedRole);
}

function login(event) {
    event.preventDefault();
    const name = document.getElementById('login-name').value.trim();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!name || !password) {
    document.getElementById('login-error').textContent = 'Enter name and password to continue.';
    return;
    }

    currentRole = selectedRole === 'ngo' ? 'ngo' : 'volunteer';
    currentUserEmail = email || null;

    if (currentRole === 'ngo') {
    let ngo = allNgos.find(n => n.name.toLowerCase() === name.toLowerCase());
    if (authMode === 'login') {
        if (!ngo || ngo.password !== password) {
        document.getElementById('login-error').textContent = 'NGO not found or password is incorrect.';
        return;
        }
    } else {
        if (ngo) {
        document.getElementById('login-error').textContent = 'This NGO already exists. Use Login.';
        return;
        }
        ngo = { id: Date.now(), name, email, password, created_at: new Date().toLocaleString() };
        allNgos.push(ngo);
        saveState();
    }
    currentNgoId = ngo.id;
    loggedInVolunteerId = null;
    } else {
    let volunteer = allVolunteers.find(v => v.name.toLowerCase() === name.toLowerCase());
    if (authMode === 'login') {
        if (!volunteer || volunteer.password !== password) {
        document.getElementById('login-error').textContent = 'Volunteer not found or password is incorrect.';
        return;
        }
    } else {
        const skills = getSelectedLoginSkills();
        if (!skills.length) {
        document.getElementById('login-error').textContent = 'Select at least one skill before signing up as a volunteer.';
        return;
        }
        if (volunteer) {
        document.getElementById('login-error').textContent = 'This volunteer already exists. Use Login.';
        return;
        }
        volunteer = {
        id: Date.now(),
        name,
        email,
        password,
        skills: skills.join(','),
        latitude: 12.9716,
        longitude: 77.5946,
        available: true
        };
        allVolunteers.push(volunteer);
        saveState();
    }
    loggedInVolunteerId = volunteer.id;
    currentNgoId = null;
    if (autoAssignWaitingTasksForVolunteer(volunteer)) {
        saveState();
    }
    }

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('ngo-dashboard').classList.toggle('hidden', currentRole !== 'ngo');
    document.getElementById('volunteer-dashboard').classList.toggle('hidden', currentRole !== 'volunteer');
    renderAll();
}

function logout() {
    currentRole = null;
    currentNgoId = null;
    loggedInVolunteerId = null;
    currentUserEmail = null;
    selectedRole = 'ngo';
    selectRole('ngo');
    document.getElementById('login-name').value = '';
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('ngo-dashboard').classList.add('hidden');
    document.getElementById('volunteer-dashboard').classList.add('hidden');
}

function setPage() { }

function setVolunteerView(view, el) {
    currentVolunteerView = view;
    document.querySelectorAll('.volunteer-nav').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');
    updateVolunteerSections();
}

function updateVolunteerSections() {
    document.querySelectorAll('.volunteer-section').forEach(section => {
    section.classList.toggle('hidden', section.dataset.volunteerView !== currentVolunteerView);
    });
}

function renderSkillControls() {
    const loginSkills = document.getElementById('login-skills');
    if (loginSkills) {
    loginSkills.innerHTML = SKILL_OPTIONS.map(skill => `
    <label class="skill-check">
    <input type="checkbox" value="${skill.value}" />
    ${skill.label}
    </label>
`).join('');
    }
    const taskSkill = document.getElementById('f-skill');
    if (taskSkill) {
    taskSkill.innerHTML = SKILL_OPTIONS.map(skill => `<option value="${skill.value}">${skill.label}</option>`).join('');
    }
}

function getSelectedLoginSkills() {
    return [...document.querySelectorAll('#login-skills input:checked')].map(input => input.value);
}

function skillLabel(skill) {
    const option = SKILL_OPTIONS.find(s => s.value === skill);
    return option ? option.label : skill.replace('_', ' ');
}

// ── Render Tasks ─────────────────────────────────────────
function renderTasks() {
    const list = document.getElementById('task-list');
    let tasks = currentRole === 'ngo' && currentNgoId ? allTasks.filter(t => t.ngoId === currentNgoId) : allTasks;
    if (currentFilter === 'assigned') tasks = tasks.filter(t => ['invite_pending', 'assigned', 'in_progress'].includes(t.status));
    else if (currentFilter !== 'all') tasks = tasks.filter(t => t.status === currentFilter);
    tasks = [...tasks].sort((a, b) => b.priority_score - a.priority_score);

    if (!tasks.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">✓</div><p>No tasks in this view.</p></div>';
    return;
    }

    list.innerHTML = tasks.map((task, i) => {
    const pc = priorityClass(task.priority_score);
    const vol = task.assigned_to ? allVolunteers.find(v => v.id === task.assigned_to) : null;
    const invitedCount = (task.invited_to || []).length;
    const acceptedCount = (task.accepted_by || []).length;
    const addressStr = task.address ? `<span>📍 ${task.address}</span>` : '';
    return `
<div class="task-card" style="animation-delay:${i * 0.04}s" onclick="taskDetail(${task.id})">
    <div class="priority-bar p-${pc}"></div>
    <div>
    <div class="task-title">${task.title}</div>
    <div class="task-meta">
        <span class="task-skill">${SKILL_EMOJI[task.required_skill] || '•'} ${task.required_skill.replace('_', ' ')}</span>
        <span>Urgency ${task.urgency}/5</span>
        <span>⚠ ${task.lives_at_risk} lives</span>
        ${vol ? `<span>👤 ${vol.name}</span>` : ''}
        ${task.invite_message ? `<span>${task.invite_message}</span>` : ''}
        <span>Requests ${invitedCount}</span>
        <span>Accepted ${acceptedCount}</span>
        ${addressStr}
    </div>
    </div>
    <div class="task-right">
    <div class="score-badge score-${pc}" title="${task.score_breakdown || ''}">${(task.priority_score).toFixed(0)}</div>
    <div class="status-tag s-${task.status}">${task.status.replace('_', ' ')}</div>
    </div>
</div>`;
    }).join('');
}

// ── Render Volunteers ────────────────────────────────────
function renderVolunteers() {
    const list = document.getElementById('vol-list');
    const avail = allVolunteers.filter(v => v.available).length;
    document.getElementById('vol-meta').textContent = `${avail} of ${allVolunteers.length} available`;
    document.getElementById('avail-count').textContent = avail;

    if (!allVolunteers.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">👤</div><p>No volunteers registered.</p></div>';
    return;
    }

    list.innerHTML = allVolunteers.map((v, i) => {
    const initials = v.name.split(' ').map(w => w[0]).join('').slice(0, 2);
    const color = AVATARS[i % AVATARS.length];
    const assigned = allTasks.find(t => t.assigned_to === v.id && t.status !== 'done');
    return `
<div class="vol-item">
    <div class="vol-avatar" style="background:${color}20;color:${color}">${initials}</div>
    <div>
    <div class="vol-name">${v.name}</div>
    <div class="vol-meta">${v.skills.split(',').map(skillLabel).join(' · ')}</div>
    <div class="vol-meta">Task: ${assigned ? assigned.title : 'Unassigned'}</div>
    </div>
    <div class="vol-status">
    <div class="avail-dot ${v.available ? 'free' : 'busy'}" title="${v.available ? 'Available' : 'On task'}"></div>
    </div>
</div>`;
    }).join('');
}

// ── Render Stats ─────────────────────────────────────────
function renderStats() {
    const visibleTasks = currentRole === 'ngo' && currentNgoId ? allTasks.filter(t => t.ngoId === currentNgoId) : allTasks;
    const avail = allVolunteers.filter(v => v.available).length;
    const pending = visibleTasks.filter(t => t.status === 'pending').length;
    const assigned = visibleTasks.filter(t => ['invite_pending', 'assigned', 'in_progress'].includes(t.status)).length;
    const critical = visibleTasks.filter(t => t.priority_score >= 150).length;

    document.getElementById('stat-volunteers').textContent = allVolunteers.length;
    document.getElementById('stat-tasks').textContent = visibleTasks.filter(t => t.status !== 'done').length;
    document.getElementById('stat-critical').textContent = critical;
    document.getElementById('stat-assigned').textContent = assigned;
    document.getElementById('stat-avail-delta').textContent = `${avail} available`;
    document.getElementById('stat-pending-delta').textContent = `${pending} pending`;
    document.getElementById('pending-count').textContent = pending;
}

// ── AI Suggestions ───────────────────────────────────────
function renderSuggestions() {
    const list = document.getElementById('suggestion-list');
    const suggestions = generateSuggestions();
    document.getElementById('sug-time').textContent = 'Updated ' + new Date().toLocaleTimeString();

    if (!suggestions.length) {
    list.innerHTML = '<div class="empty"><div class="empty-icon">✅</div><p>All looks good. No immediate action required.</p></div>';
    return;
    }

    list.innerHTML = suggestions.map(s => `
<div class="suggestion">
    ${s.message}
    <div class="sug-action">
    <button class="sug-btn apply" onclick="applySuggestion('${s.action}', ${JSON.stringify(s.payload).replace(/"/g, '&quot;')})">Apply</button>
    <button class="sug-btn dismiss" onclick="dismissSuggestion('${s.id}')">Dismiss</button>
    </div>
</div>
`).join('');
}

function dismissSuggestion(id) {
    dismissedSuggestionIds.push(id);
    renderSuggestions();
}

function generateSuggestions() {
    const suggestions = [];
    const criticalPending = allTasks.filter(t => t.status === 'pending' && t.priority_score >= 150);
    const freeVols = allVolunteers.filter(v => v.available);

    allTasks.filter(t => t.status === 'invite_pending').forEach(task => {
    const invited = allVolunteers.find(v => v.id === task.assigned_to);
    if (invited) {
        suggestions.push({
        id: `invite-${task.id}`,
        message: `<strong>Invite pending:</strong> ${invited.name} has been invited to "${task.title}" and needs to accept before work starts.`,
        action: 'alert',
        payload: {}
        });
    }
    });

    criticalPending.forEach(task => {
    const match = freeVols.find(v => v.skills.includes(task.required_skill));
    if (match) {
        suggestions.push({
        id: `match-${task.id}-${match.id}`,
        message: `<strong>Critical task unassigned:</strong> "${task.title}" needs a ${task.required_skill.replace('_', ' ')} volunteer. <strong>${match.name}</strong> is available and matches.`,
        action: 'assign',
        payload: { taskId: task.id, volId: match.id }
        });
    }
    });

    const overloaded = allVolunteers.filter(v => !v.available);
    if (overloaded.length === allVolunteers.length && criticalPending.length) {
    suggestions.push({
        id: 'overloaded',
        message: `<strong>All volunteers are busy.</strong> ${criticalPending.length} critical task(s) remain unassigned. Consider recruiting more first-aid or rescue volunteers.`,
        action: 'alert',
        payload: {}
    });
    }

    const doneTasks = allTasks.filter(t => t.status === 'done');
    const freeAfterDone = allVolunteers.filter(v => !v.available);
    if (doneTasks.length > 0 && freeAfterDone.length > 0) {
    const nextPending = allTasks.find(t => t.status === 'pending');
    if (nextPending) {
        suggestions.push({
        id: `redeploy-${nextPending.id}`,
        message: `<strong>Volunteers freed up.</strong> "${nextPending.title}" is next in priority queue. Re-run assignment to redeploy.`,
        action: 'reassign',
        payload: {}
        });
    }
    }

    return suggestions.filter(s => !dismissedSuggestionIds.includes(s.id)).slice(0, 3);
}

function applySuggestion(action, payload) {
    if (action === 'assign') {
    const task = allTasks.find(t => t.id === payload.taskId);
    const vol = allVolunteers.find(v => v.id === payload.volId);
    if (task && vol) {
        inviteVolunteer(task, vol);
        saveState();
        renderAll();
        toast(`Invite sent to ${vol.name} for "${task.title}"`, 'success');
    }
    }
    if (action === 'reassign') {
    triggerReassign();
    }
    if (action === 'alert') {
    toast('Alert noted. Manual recruitment required.', 'error');
    }
}

// ── Local re-assignment ───────────────────────────────────
function triggerReassign() {
    const pending = [...allTasks]
    .filter(t => t.status === 'pending')
    .sort((a, b) => b.priority_score - a.priority_score);

    let assigned = 0;
    pending.forEach(task => {
    if (autoAssignTask(task)) assigned++;
    });

    renderAll();
    saveState();
    toast(`Re-assignment complete. ${assigned} invite(s) sent.`, 'success');
}

function inviteVolunteer(task, volunteer) {
    task.status = 'invite_pending';
    task.invited_to = task.invited_to || [];
    task.accepted_by = task.accepted_by || [];
    if (!task.invited_to.includes(volunteer.id)) task.invited_to.push(volunteer.id);
    task.invited_at = new Date().toLocaleString();
    task.invite_message = `Invite sent to ${task.invited_to.length} volunteer(s)`;
}

function autoAssignTask(task) {
    const matches = allVolunteers.filter(v => v.available && v.skills.split(',').includes(task.required_skill));
    matches.forEach(volunteer => inviteVolunteer(task, volunteer));
    return matches.length > 0;
}

function autoAssignWaitingTasksForVolunteer(volunteer) {
    if (!volunteer.available) return false;
    const matches = [...allTasks]
    .filter(t => t.status === 'pending' && volunteer.skills.split(',').includes(t.required_skill))
    .sort((a, b) => b.priority_score - a.priority_score);
    matches.forEach(task => inviteVolunteer(task, volunteer));
    return matches.length > 0;
}

// ── Modal ─────────────────────────────────────────────────
function openModal() {
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => {
    initCreateMap();
    if (createMap) createMap.invalidateSize();
    }, 350);
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

async function submitTask() {
    const title = document.getElementById('f-title').value.trim();
    const skill = document.getElementById('f-skill').value;
    const urgency = parseInt(document.getElementById('f-urgency').value);
    const lives = parseInt(document.getElementById('f-lives').value);
    const lat = selectedTaskLat;
    const lon = selectedTaskLng;

    if (!title) { toast('Please enter a task title', 'error'); return; }

    const newTask = {
    id: Date.now(),
    ngoId: currentNgoId,
    title, required_skill: skill, urgency, lives_at_risk: lives,
    latitude: lat, longitude: lon, address: selectedTaskAddress,
    status: 'pending', assigned_to: null, priority_score: 0, score_breakdown: '',
    invited_to: [], accepted_by: [], created_at: new Date().toLocaleString()
    };

    updatePriorityScore(newTask);
    allTasks.push(newTask);
    const invited = autoAssignTask(newTask);

    closeModal();
    document.getElementById('f-title').value = '';
    saveState();
    renderAll();
    toast(invited
    ? `Task "${title}" created and matching volunteer invite sent.`
    : `Task "${title}" created. No available volunteer has ${skillLabel(skill)} yet.`,
    invited ? 'success' : 'error');
}

// ── Filter tabs ───────────────────────────────────────────
function filterTasks(filter, el) {
    currentFilter = filter;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderTasks();
}

function taskDetail(id) {
    const t = allTasks.find(x => x.id === id);
    if (t) toast(t.score_breakdown || `Priority score: ${t.priority_score.toFixed(0)}`, 'success');
}

// ── Load data ─────────────────────────────────────────────
function getLoggedInVolunteer() {
    return allVolunteers.find(v => v.id === loggedInVolunteerId) || null;
}

function getMyActiveTask() {
    const volunteer = getLoggedInVolunteer();
    if (!volunteer) return null;
    return allTasks.find(t =>
    (t.assigned_to === volunteer.id || (t.status === 'invite_pending' && (t.invited_to || []).includes(volunteer.id))) &&
    t.status !== 'done' &&
    t.status !== 'declined'
    );
}

function volunteerStatusLabel(status) {
    if (status === 'invite_pending') return 'Invite Pending';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'done') return 'Done';
    return 'Pending';
}

function renderVolunteerDashboard() {
    if (currentRole !== 'volunteer') return;
    renderMyTask();
    renderMyProfile();
    renderNearbyTasks();
    renderActivityLog();
    updateVolunteerSections();
}

function renderMyTask() {
    const card = document.getElementById('my-task-card');
    const task = getMyActiveTask();
    if (!task) {
    card.innerHTML = `
    <div class="panel-meta">My Assigned Task</div>
    <div class="empty" style="padding:34px 12px"><div class="empty-icon">+</div><p>No task assigned yet</p></div>
`;
    return;
    }
    card.innerHTML = `
<div class="panel-meta">My Assigned Task</div>
<div class="assigned-title">${task.title}</div>
<div class="assigned-meta">
    <span class="info-pill">📍 ${task.address || (task.latitude.toFixed(4) + ', ' + task.longitude.toFixed(4))}</span>
    <span class="info-pill">Urgency ${priorityLabel(task.priority_score)}</span>
    <span class="info-pill">${skillLabel(task.required_skill)}</span>
    <span class="status-tag s-${task.status}">${volunteerStatusLabel(task.status)}</span>
</div>
<div style="margin-bottom: 16px;">
    <button class="btn" style="color:var(--accent); border-color:var(--border2);" onclick="openViewLocationModal(${task.latitude}, ${task.longitude}, \`${task.address || ''}\`)">📍 View Location</button>
</div>
${task.status === 'invite_pending' ? `
    <div class="suggestion" style="margin-bottom:16px">
    Automatic invite: this task matches your ${skillLabel(task.required_skill)} skill. Accept to start working on it.
    </div>
    <div class="topbar-actions">
    <button class="btn btn-primary" onclick="acceptMyInvite()">Accept Invite</button>
    <button class="btn" onclick="declineMyInvite()">Decline</button>
    </div>
` : `
    <div class="topbar-actions">
    <button class="btn" onclick="markMyTaskInProgress()">Mark In Progress</button>
    <button class="btn btn-primary" onclick="markMyTaskComplete()">Mark Complete</button>
    </div>
`}
`;
}

function renderMyProfile() {
    const volunteer = getLoggedInVolunteer();
    const panel = document.getElementById('profile-panel');
    if (!volunteer) {
    panel.innerHTML = '<div class="empty"><p>No volunteer profile found.</p></div>';
    return;
    }
    const activeTask = getMyActiveTask();
    const assignedCount = allTasks.filter(t => t.assigned_to === volunteer.id && t.status !== 'done' && t.status !== 'declined').length;
    const completedCount = volunteerActivityLog.filter(item => item.volunteerId === volunteer.id).length;
    document.getElementById('profile-state').textContent = volunteer.available ? 'Available' : 'Unavailable';
    panel.innerHTML = `
<div class="profile-summary">
    <div class="profile-row">
    <div>
        <div class="vol-name" style="font-size:18px">${volunteer.name}</div>
        <div class="vol-meta">${volunteer.email || currentUserEmail || 'Session volunteer'}</div>
        <div class="skill-tags">
        ${volunteer.skills.split(',').map(skill => `<span class="skill-tag">${skillLabel(skill)}</span>`).join('')}
        </div>
    </div>
    <label class="switch" title="Availability">
        <input type="checkbox" ${volunteer.available ? 'checked' : ''} onchange="toggleMyAvailability(this.checked)" />
        <span class="slider"></span>
    </label>
    </div>
    <div class="profile-stats">
    <div class="mini-stat">
        <div class="mini-stat-value">${assignedCount}</div>
        <div class="mini-stat-label">Assigned</div>
    </div>
    <div class="mini-stat">
        <div class="mini-stat-value">${completedCount}</div>
        <div class="mini-stat-label">Completed</div>
    </div>
    <div class="mini-stat">
        <div class="mini-stat-value">${volunteer.skills.split(',').length}</div>
        <div class="mini-stat-label">Skills</div>
    </div>
    </div>
    <div class="nearby-row">
    <div>
        <div class="row-title">${activeTask ? activeTask.title : 'No active assignment'}</div>
        <div class="row-meta">${activeTask ? volunteerStatusLabel(activeTask.status) : 'Available for matching tasks'}</div>
    </div>
    <div class="skill-tags">
        <span class="skill-tag">${volunteer.available ? 'available' : 'busy'}</span>
    </div>
    </div>
    <div class="profile-skill-editor">
    <div class="form-label">Add skills</div>
    <div class="checkbox-grid">
        ${SKILL_OPTIONS.map(skill => `
        <label class="skill-check">
            <input type="checkbox" value="${skill.value}" ${(volunteer.skills || '').split(',').includes(skill.value) ? 'checked' : ''} onchange="updateMySkills()" />
            ${skill.label}
        </label>
        `).join('')}
    </div>
    </div>
</div>
`;
}

function updateMySkills() {
    const volunteer = getLoggedInVolunteer();
    if (!volunteer) return;
    const checked = [...document.querySelectorAll('#profile-panel .skill-check input:checked')].map(input => input.value);
    if (!checked.length) {
    toast('Keep at least one skill on your profile.', 'error');
    renderMyProfile();
    return;
    }
    volunteer.skills = checked.join(',');
    autoAssignWaitingTasksForVolunteer(volunteer);
    saveState();
    renderAll();
}

function renderNearbyTasks() {
    const list = document.getElementById('nearby-list');
    const nearby = [...allTasks]
    .filter(t => t.status === 'pending')
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3);
    if (!nearby.length) {
    list.innerHTML = '<div class="empty"><p>No pending tasks nearby.</p></div>';
    return;
    }
    list.innerHTML = nearby.map(task => {
    const pc = priorityClass(task.priority_score);
    return `
    <div class="nearby-row">
    <div>
        <div class="row-title">${task.title}</div>
        <div class="row-meta">${skillLabel(task.required_skill)}</div>
    </div>
    <span class="score-badge score-${pc}">${priorityLabel(task.priority_score)}</span>
    </div>
`;
    }).join('');
}

function renderActivityLog() {
    const list = document.getElementById('activity-list');
    const volunteer = getLoggedInVolunteer();
    const myLog = volunteer ? volunteerActivityLog.filter(item => item.volunteerId === volunteer.id) : [];
    document.getElementById('activity-count').textContent = `${myLog.length} complete`;
    if (!myLog.length) {
    list.innerHTML = '<div class="empty"><p>No completed task activity yet.</p></div>';
    return;
    }
    list.innerHTML = myLog.map(item => `
<div class="activity-row">
    <div>
    <div class="row-title">${item.title}</div>
    <div class="row-meta">${item.timestamp}</div>
    </div>
    <span class="status-tag s-done">Done</span>
</div>
`).join('');
}

function toggleMyAvailability(available) {
    const volunteer = getLoggedInVolunteer();
    if (!volunteer) return;
    if (available && getMyActiveTask()) {
    toast('Finish or decline your current task before becoming available.', 'error');
    renderMyProfile();
    return;
    }
    volunteer.available = available;
    saveState();
    renderAll();
}

function acceptMyInvite() {
    const task = getMyActiveTask();
    const volunteer = getLoggedInVolunteer();
    if (!task || !volunteer || task.status !== 'invite_pending') return;
    task.accepted_by = task.accepted_by || [];
    if (!task.accepted_by.includes(volunteer.id)) task.accepted_by.push(volunteer.id);
    if (!task.assigned_to) task.assigned_to = volunteer.id;
    task.status = 'assigned';
    task.invite_message = `${task.accepted_by.length} accepted of ${(task.invited_to || []).length} requested`;
    volunteer.available = false;
    saveState();
    renderAll();
    toast(`Accepted "${task.title}". You can start work now.`, 'success');
}

function declineMyInvite() {
    const task = getMyActiveTask();
    const volunteer = getLoggedInVolunteer();
    if (!task || task.status !== 'invite_pending' || !volunteer) return;
    task.status = 'pending';
    task.invited_to = (task.invited_to || []).filter(id => id !== volunteer.id);
    task.accepted_by = (task.accepted_by || []).filter(id => id !== volunteer.id);
    if (task.assigned_to === volunteer.id) task.assigned_to = null;
    task.invite_message = `${volunteer.name} declined invite`;
    volunteer.available = true;
    saveState();
    renderAll();
    toast(`Declined "${task.title}". It is back in the NGO queue.`, 'error');
}

function markMyTaskInProgress() {
    const task = getMyActiveTask();
    if (!task || task.status === 'invite_pending') return;
    task.status = 'in_progress';
    const volunteer = getLoggedInVolunteer();
    if (volunteer) volunteer.available = false;
    saveState();
    renderAll();
}

function markMyTaskComplete() {
    const task = getMyActiveTask();
    const volunteer = getLoggedInVolunteer();
    if (!task || !volunteer || task.status === 'invite_pending') return;
    task.status = 'done';
    volunteer.available = true;
    volunteerActivityLog.unshift({
    volunteerId: volunteer.id,
    title: task.title,
    timestamp: new Date().toLocaleString()
    });
    saveState();
    renderAll();
}

async function loadData() {
    renderAll();
    toast('Live dashboard refreshed', 'success');
}

function renderAll() {
    renderStats();
    renderTasks();
    renderVolunteers();
    renderSuggestions();
    renderVolunteerDashboard();
}

// ── WebSocket live connection ─────────────────────────────
function connectWS() {
    renderAll();
}

// ── Init ──────────────────────────────────────────────────
loadState();
renderSkillControls();
setAuthMode('signup');
renderAll();
connectWS();
setInterval(renderSuggestions, 30000); // refresh suggestions every 30s
setInterval(() => {
    if (allTasks.length > 0) {
    allTasks.forEach(updatePriorityScore);
    saveState();
    renderAll();
    }
}, 10 * 60 * 1000); // 10 minutes priority recalculation
