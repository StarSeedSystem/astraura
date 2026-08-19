/**
 * Astraura 1.58-Bit API Service & Universal Hybrid Bridge (v3.2)
 * Connects to local FastAPI backend (via HTTPS Cloudflare Tunnel or direct LAN)
 * or falls back to autonomous in-browser cognitive exocortex when completely offline.
 */

export const DEFAULT_HTTPS_GATEWAY = 'https://orientation-receives-planets-computational.trycloudflare.com';

export function getGatewayUrl() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('astraura_backend_gateway');
    if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
    
    // If running on localhost or 127.0.0.1
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '';
    }
    // If deployed on Vercel or external host, default to the live HTTPS Cloudflare Tunnel
    return DEFAULT_HTTPS_GATEWAY;
  }
  return '';
}

export function setCustomGateway(url) {
  if (typeof localStorage !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('astraura_backend_gateway', url.trim());
    } else {
      localStorage.removeItem('astraura_backend_gateway');
    }
  }
}

export function getApiBase() {
  const gw = getGatewayUrl();
  return gw ? `${gw}/api` : '/api';
}

export async function testGatewayConnection(urlToTest = null) {
  const target = (urlToTest !== null ? urlToTest : getGatewayUrl()) || '';
  const endpoint = target ? `${target.replace(/\/$/, '')}/api/status` : '/api/status';
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(endpoint, { signal: ctrl.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error(`No se pudo conectar con el Gateway (${err.message})`);
  }
}

async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} en ${path}: ${errText || res.statusText}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return res;
  } catch (err) {
    // If failed on external host, try fallback
    console.warn(`[Astraura Bridge] Fetch error on ${url}:`, err.message);
    throw err;
  }
}

// ================= Status & Profiler APIs =================

export async function fetchStatus() {
  return apiFetch('/status');
}

export async function fetchHardwareProfile() {
  return apiFetch('/profile');
}

export async function fetchEnvironment() {
  return apiFetch('/environment');
}

export async function fetchMemoryGraph() {
  return apiFetch('/memory/graph');
}

export async function fetchLearningEvents() {
  return apiFetch('/memory/events');
}

export async function triggerBitNetBuild() {
  return apiFetch('/bitnet/build', { method: 'POST' });
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/upload', {
    method: 'POST',
    body: formData
  });
}

export async function triggerReindex() {
  return apiFetch('/memory/index', { method: 'POST' });
}

// ================= Swarm & Multi-Area Multi-Agent Orchestration APIs =================

export async function fetchSwarmStatus() {
  return apiFetch('/swarm/status');
}

export async function updateSwarmCapacityMode(mode, manualPercent = null) {
  return apiFetch('/swarm/capacity_mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, manual_percent: manualPercent })
  });
}

export async function dispatchSwarmTask(areaId, title, prompt, agentId = null) {
  return apiFetch('/swarm/task/dispatch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area_id: areaId, title, prompt, agent_id: agentId })
  });
}

export async function cancelSwarmTask(taskId) {
  return apiFetch('/swarm/task/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId })
  });
}

export async function toggleSwarmSchedule(scheduleId, enabled) {
  return apiFetch('/swarm/schedule/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule_id: scheduleId, enabled })
  });
}

export async function updateSwarmScheduleFrequency(scheduleId, frequencyMinutes) {
  return apiFetch('/swarm/schedule/frequency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule_id: scheduleId, frequency_minutes: frequencyMinutes })
  });
}

export async function createSwarmSchedule(title, areaId, agentId, frequencyMinutes, prompt = '') {
  return apiFetch('/swarm/schedule/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, area_id: areaId, agent_id: agentId, frequency_minutes: frequencyMinutes, prompt })
  });
}

export async function toggleAgent(agentId, enabled) {
  return apiFetch('/swarm/agent/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, enabled })
  });
}

export async function updateAgentConcurrency(agentId, concurrency) {
  return apiFetch('/swarm/agent/concurrency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, concurrency })
  });
}

// ================= Vault & Connections APIs =================

export async function fetchVaultData() {
  return apiFetch('/vault');
}

export async function updateVaultConnection(connId, updates) {
  return apiFetch('/vault/connection/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conn_id: connId, ...updates })
  });
}

export async function updateVaultParameters(parameters) {
  return apiFetch('/vault/parameters/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parameters })
  });
}

// ================= Workflows Engine APIs =================

export async function fetchWorkflows() {
  return apiFetch('/workflows');
}

export async function toggleWorkflow(workflowId, enabled) {
  return apiFetch('/workflows/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: workflowId, enabled })
  });
}

export async function runWorkflow(workflowId) {
  return apiFetch('/workflows/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_id: workflowId })
  });
}

export async function saveWorkflow(workflow) {
  return apiFetch('/workflows/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow })
  });
}

export async function deleteWorkflow(workflowId) {
  return apiFetch(`/workflows/${workflowId}`, {
    method: 'DELETE'
  });
}

// ================= Dream Studio & Imagination APIs =================

export async function fetchDreamStatus() {
  return apiFetch('/dream/status');
}

export async function fetchDreamProcessTypes() {
  return apiFetch('/dream/process_types');
}

export async function updateDreamConfig(config) {
  return apiFetch('/dream/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}

export async function triggerDream(theme = null, parentBranchId = null, processType = null) {
  return apiFetch('/dream/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, parent_branch_id: parentBranchId, process_type: processType })
  });
}

export async function addDreamCreation(title, type, content, tags = [], originBranch = null) {
  return apiFetch('/dream/creation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, type, content, tags, origin_branch: originBranch })
  });
}

export async function addDreamReminder(text, time) {
  return apiFetch('/dream/reminder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, time })
  });
}

export async function toggleDreamReminder(reminderId) {
  return apiFetch('/dream/reminder/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reminder_id: reminderId })
  });
}

export async function handleDreamBranchAction(branchId, action, data = null) {
  return apiFetch('/dream/branch/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch_id: branchId, action, data })
  });
}

export async function handleDreamCreationAction(creationId, action, data = null) {
  return apiFetch('/dream/creation/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, action, data })
  });
}

// ================= StarSeed Memory & Recuerdos Core APIs =================

export async function fetchStarSeedMemoryGraph() {
  return apiFetch('/memory/starseed');
}

export async function fetchStarSeedManifest() {
  return apiFetch('/memory/starseed/manifest');
}

export async function fetchStarSeedDocuments(branch = null) {
  const url = branch ? `/memory/starseed/documents?branch=${encodeURIComponent(branch)}` : `/memory/starseed/documents`;
  return apiFetch(url);
}

export async function saveStarSeedDocument(doc) {
  return apiFetch('/memory/starseed/document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc })
  });
}

export async function deleteStarSeedDocument(docId) {
  return apiFetch(`/memory/starseed/document/${docId}`, {
    method: 'DELETE'
  });
}

export async function searchStarSeedMemory(query, branch = null, topK = 5) {
  return apiFetch('/memory/starseed/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, branch, top_k: topK })
  });
}

export async function fetchOpenVikingMemory() {
  return apiFetch('/memory/openviking');
}

export async function fetchRecuerdos() {
  return apiFetch('/memory/recuerdos');
}

export async function saveRecuerdos(recuerdosData) {
  return apiFetch('/memory/recuerdos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recuerdosData)
  });
}

export async function fetchMem0Memories(userId = 'alex', agentId = null) {
  const url = agentId ? `/memory/mem0/list?user_id=${userId}&agent_id=${agentId}` : `/memory/mem0/list?user_id=${userId}`;
  return apiFetch(url).catch(() => ({ memories: [] }));
}

export async function updateMem0Memory(memoryId, memoryText, category = 'general', metadata = {}) {
  return apiFetch('/memory/mem0/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memory_id: memoryId, memory_text: memoryText, category, metadata })
  }).catch(() => ({ success: true }));
}

export async function deleteMem0Memory(memoryId) {
  return apiFetch(`/memory/mem0/delete/${memoryId}`, {
    method: 'DELETE'
  }).catch(() => ({ success: true }));
}

export async function searchMem0Memories(query, topK = 5) {
  return apiFetch('/memory/mem0/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK })
  }).catch(() => ({ results: [] }));
}

export async function modifyBrainMemory(brainId, memoryData) {
  return apiFetch('/cerebros/modify_memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId, memory_data: memoryData })
  }).catch(() => ({ success: true }));
}

// ================= Cerebros Multi-Dimensionales APIs =================

export async function fetchCerebros() {
  return apiFetch('/cerebros');
}

export async function activateBrain(brainId) {
  return apiFetch('/cerebros/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId })
  });
}

export async function saveBrain(brain) {
  return apiFetch('/cerebros/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain })
  });
}

export async function deleteBrain(brainId) {
  return apiFetch(`/cerebros/${brainId}`, {
    method: 'DELETE'
  });
}

export async function scanContextFolder(folderPath) {
  return apiFetch('/cerebros/scan_folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_path: folderPath })
  });
}

export async function linkGDriveSource(brainId, gdriveSource) {
  return apiFetch('/cerebros/link_gdrive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId, gdrive_source: gdriveSource })
  });
}

export async function deleteGDriveSource(brainId, sourceId) {
  return apiFetch('/cerebros/delete_gdrive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId, source_id: sourceId })
  });
}

export async function syncBrainSources(brainId) {
  return apiFetch('/cerebros/sync_sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId })
  });
}

export async function fetchBrainSynapticTree(brainId) {
  return apiFetch(`/cerebros/${brainId}/synaptic_tree`);
}

export async function attachBrainMemory(brainId, memory, personalityId = null, agentId = null) {
  return apiFetch('/cerebros/memory/attach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brain_id: brainId,
      memory,
      personality_id: personalityId,
      agent_id: agentId
    })
  });
}

export async function controlBrainProcess(brainId, agentId, action, params = {}) {
  return apiFetch('/cerebros/process/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brain_id: brainId,
      agent_id: agentId,
      action,
      params
    })
  });
}

export async function autoLinkBrainSynapses(brainId) {
  return apiFetch('/cerebros/auto_link_synapses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId })
  });
}

// ================= Universal Code & Project Execution APIs =================

export async function executeCode(language, code, projectFiles = null) {
  return apiFetch('/execute/code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, code, project_files: projectFiles })
  });
}

export async function executeMultiFileProject(name, files, entrypoint = 'index.html') {
  return apiFetch('/execute/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, files, entrypoint })
  });
}

export async function fetchProjectVault() {
  return apiFetch('/projects/vault');
}

export async function saveProjectToVault(name, files, description = '', entrypoint = 'index.html') {
  return apiFetch('/projects/vault/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, files, description, entrypoint })
  });
}

export async function linkLocalProjectFolder(folderPath) {
  return apiFetch('/projects/link_folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_path: folderPath })
  });
}

export async function exportProjectZip(name, files, description = '') {
  const base = getApiBase();
  const res = await fetch(`${base}/projects/export/zip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, files, description })
  });
  if (!res.ok) throw new Error('Failed to export project as zip');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  return { success: true };
}

export const executeCodeOnBackend = executeCode;
export const executeProjectOnBackend = executeMultiFileProject;
export const saveProject = saveProjectToVault;
export const exportProjectToDisk = exportProjectZip;
export const linkProjectFolder = linkLocalProjectFolder;

export async function addMem0Memory(memoryText, category = 'general', metadata = {}) {
  try {
    return await apiFetch('/memory/mem0/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_text: memoryText, category, metadata })
    });
  } catch {
    return { success: true };
  }
}

// ================= Personalities & Affective Profiles APIs =================

export async function fetchPersonalities() {
  return apiFetch('/personalities');
}

export async function activatePersonality(personaId) {
  return apiFetch('/personalities/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona_id: personaId })
  });
}

export async function savePersonality(persona) {
  return apiFetch('/personalities/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona })
  });
}

export async function deletePersonality(personaId) {
  return apiFetch(`/personalities/${personaId}`, {
    method: 'DELETE'
  });
}

// ================= Personality Sovereign APIs & Server Synchronization =================

export async function fetchPersonalityApiKeys() {
  return apiFetch('/personalities/api_keys');
}

export async function fetchPersonalityApiDetail(personaId) {
  return apiFetch(`/personalities/${personaId}/api_status`);
}

export async function regeneratePersonalityApiKey(personaId) {
  return apiFetch(`/personalities/${personaId}/generate_key`, {
    method: 'POST'
  });
}

export async function revokePersonalityApiKey(personaId) {
  return apiFetch(`/personalities/${personaId}/revoke_key`, {
    method: 'POST'
  });
}

export async function restorePersonalityApiKey(personaId) {
  return apiFetch(`/personalities/${personaId}/restore_key`, {
    method: 'POST'
  });
}

export async function updatePersonalityApiPermissions(personaId, permissions) {
  return apiFetch(`/personalities/${personaId}/update_permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  });
}

export async function savePersonalitySyncServer(personaId, serverConfig) {
  return apiFetch(`/personalities/${personaId}/sync_server`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server_config: serverConfig })
  });
}

export async function deletePersonalitySyncServer(personaId, serverId) {
  return apiFetch(`/personalities/${personaId}/sync_server/${serverId}`, {
    method: 'DELETE'
  });
}

export async function triggerPersonalityServerSync(personaId, serverId) {
  return apiFetch(`/personalities/${personaId}/trigger_sync/${serverId}`, {
    method: 'POST'
  });
}

// ================= Autonomous Browser & Search APIs =================

export async function navigateBrowser(url, takeScreenshot = true) {
  return apiFetch('/browser/navigate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, take_screenshot: takeScreenshot })
  });
}

export async function searchBrowser(query, numResults = 5) {
  return apiFetch('/browser/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, num_results: numResults })
  });
}

export async function executeBrowserAction(url, actions, takeScreenshot = true) {
  return apiFetch('/browser/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, actions, take_screenshot: takeScreenshot })
  });
}

export async function indexWebpageToMemory(url, title, content) {
  return apiFetch('/browser/index_memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, content })
  });
}

// ================= Auto-Discovery & Universal Installer APIs =================

export async function runDiscoveryScan() {
  return apiFetch('/discovery/scan');
}

export async function fetchInstallerScript() {
  const base = getApiBase();
  const res = await fetch(`${base}/installer/script`);
  if (!res.ok) throw new Error('Failed to fetch installer script');
  return res.text();
}

// ================= Computer-Wide Filesystem APIs =================

export async function fetchComputerFiles(path = null) {
  const url = path ? `/system/fs?path=${encodeURIComponent(path)}` : `/system/fs`;
  return apiFetch(url);
}

export async function readComputerFile(path) {
  return apiFetch(`/system/file?path=${encodeURIComponent(path)}`);
}

export async function searchComputerFiles(query, root = null) {
  let url = `/system/search?query=${encodeURIComponent(query)}`;
  if (root) url += `&root=${encodeURIComponent(root)}`;
  return apiFetch(url);
}

// ================= Sensorium 360° APIs =================

export async function fetchSensoriumStatus() {
  return apiFetch('/sensorium/status');
}

export async function updateSensoriumPermissions(permissions) {
  return apiFetch('/sensorium/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  });
}

export async function updateSensoryFeed(feedType, data) {
  return apiFetch('/sensorium/feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feed_type: feedType, data })
  });
}

export async function updateSensoriumLocation(location) {
  return apiFetch('/sensorium/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location })
  });
}

// ================= Intuitive Imagination Always-On APIs =================

export async function fetchImaginationStatus() {
  return apiFetch('/imagination/status');
}

export async function fetchImaginationProcessTypes() {
  return apiFetch('/imagination/process_types');
}

export async function updateImaginationConfig(config) {
  return apiFetch('/imagination/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
}

export async function triggerImaginationCycle(theme = null, processType = null) {
  return apiFetch('/imagination/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, process_type: processType })
  });
}

export async function recycleImaginationMemories() {
  return apiFetch('/imagination/recycle', {
    method: 'POST'
  });
}

export async function handleImaginationAction(itemId, itemType = 'branch', action = 'apply', data = null) {
  return apiFetch('/imagination/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_id: itemId, item_type: itemType, action, data })
  });
}

export async function fetchProcessDetails(processId) {
  return apiFetch(`/imagination/process/${processId}`);
}

export async function fetchProcessBranches(processId) {
  return apiFetch(`/imagination/process/${processId}/branches`);
}

export async function regenerateBranch(branchId) {
  return apiFetch(`/imagination/branch/${branchId}/regenerate`, {
    method: 'POST'
  });
}

export async function forkBranch(branchId, forkNote = '') {
  return apiFetch(`/imagination/branch/${branchId}/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fork_note: forkNote })
  });
}

export async function modifyBranch(branchId, data) {
  return apiFetch(`/imagination/branch/${branchId}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
}

export async function deleteBranch(branchId) {
  return apiFetch(`/imagination/branch/${branchId}`, {
    method: 'DELETE'
  });
}

export async function grantAllRequests() {
  return apiFetch('/imagination/requests/grant_all', {
    method: 'POST'
  });
}

export async function grantSingleRequest(branchId, data = null) {
  return apiFetch(`/imagination/requests/${branchId}/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
}

export async function updateProcessConfig(processId, config) {
  return apiFetch(`/imagination/process/${processId}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
}

export async function fetchDualTrunkGovernor() {
  return apiFetch('/system/dual_trunk');
}

export async function updateDualTrunkGovernor(imaginationPercent, swarmPercent) {
  return apiFetch('/system/dual_trunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imagination_percent: imaginationPercent, swarm_percent: swarmPercent })
  });
}

export async function handleImaginationSuggestionAction(suggestionId, action) {
  return apiFetch('/imagination/suggestion/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestion_id: suggestionId, action })
  });
}

// ================= System Notifications & Branching Logs APIs =================

export async function fetchSystemNotifications() {
  return apiFetch('/notifications');
}

export async function markNotificationsRead(notifId = null) {
  return apiFetch('/notifications/mark_read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notif_id: notifId })
  });
}

// ================= Storage Media, Folders & Files Dynamic Memory Routing APIs =================

export async function fetchStorageDevices() {
  return apiFetch('/storage/devices');
}

export async function fetchStorageRules() {
  return apiFetch('/storage/rules');
}

export async function createOrUpdateStorageRule(rule) {
  return apiFetch('/storage/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rule })
  });
}

export async function deleteStorageRule(ruleId) {
  return apiFetch(`/storage/rules/${ruleId}`, {
    method: 'DELETE'
  });
}

export async function scanStorageNow() {
  return apiFetch('/storage/scan_now', {
    method: 'POST'
  });
}

export async function simulateStorageConnection(ruleId) {
  return apiFetch(`/storage/rules/${ruleId}/simulate`, {
    method: 'POST'
  });
}

// ================= Sovereign Privacy & Sensor Permissions Control APIs =================

export async function fetchPrivacySettings() {
  return apiFetch('/privacy/settings');
}

export async function updatePrivacySettings(settings) {
  return apiFetch('/privacy/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings })
  });
}

export async function toggleAirGapMode(enabled = null) {
  return apiFetch('/privacy/toggle_air_gap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
}

export async function uploadChatAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/upload', {
    method: 'POST',
    body: formData
  });
}

export async function indexCustomPath(path) {
  return apiFetch('/system/index_path', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path })
  });
}

export async function fetchSensoriumLive() {
  return apiFetch('/sensorium/status');
}

export async function updateClientSensors(data) {
  return apiFetch('/sensorium/feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feed_type: 'client_sensors', data })
  });
}

export async function fetchLiveWeather(lat, lon) {
  return apiFetch(`/sensorium/weather?lat=${lat}&lon=${lon}`);
}

export async function fetchSkillsCatalog() {
  return apiFetch('/skills/catalog');
}

export async function toggleSkill(skillId, enabled) {
  return apiFetch('/skills/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skill_id: skillId, enabled })
  });
}

export async function executeTerminalCommand(command) {
  return apiFetch('/terminal/exec', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  });
}

// ================= Device Context & File System Storage APIs =================

export function getDevicePreferences() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('astraura_device_preferences');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDevicePreferences(prefs) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('astraura_device_preferences', JSON.stringify(prefs));
  } catch (e) {
    console.warn('Could not save device preferences:', e);
  }
}

export async function scanLocalFolderViaPicker() {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    throw new Error('Tu navegador no soporta la API de Acceso al Sistema de Archivos (disponible en Chrome, Edge, Brave y Opera).');
  }

  const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
  const files = [];

  async function traverse(handle, currentPath = '') {
    for await (const entry of handle.values()) {
      const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (['md', 'txt', 'py', 'js', 'json', 'cpp', 'html', 'css', 'rs', 'sh', 'yaml', 'yml'].includes(ext)) {
          const file = await entry.getFile();
          const text = await file.text();
          files.push({
            filename: entry.name,
            path: entryPath,
            size: file.size,
            content: text.slice(0, 25000),
            language: ext
          });
        }
      } else if (entry.kind === 'directory' && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await traverse(entry, entryPath);
      }
    }
  }

  await traverse(dirHandle, dirHandle.name);
  return {
    success: true,
    folder_name: dirHandle.name,
    total_files: files.length,
    files
  };
}

// ================= Bulk Apply & Gradual Permission Policy APIs =================

export async function applyAllProposals(itemIds = null) {
  return await apiFetch('/imagination/apply_all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_ids: itemIds })
  });
}

export async function updateProcessPermissionPolicy(processId, policy) {
  return await apiFetch(`/imagination/process/${processId}/permission_policy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy })
  });
}

export async function fetchUniversalDeviceAccess() {
  return await apiFetch('/system/universal_device_access');
}

export async function grantUniversalPermission(permissionKey, granted = true) {
  return await apiFetch('/system/universal_device_access/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permission_key: permissionKey, granted })
  });
}

// ================= Real-time WebSocket Client =================

export class ChatWebSocketClient {
  constructor(onMessage, onOpen, onClose) {
    this.onMessage = onMessage;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.ws = null;
    this.reconnectTimer = null;
  }

  connect() {
    const gw = getGatewayUrl();
    let wsUrl;
    if (gw) {
      const wsProtocol = gw.startsWith('https:') ? 'wss:' : 'ws:';
      const cleanHost = gw.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${cleanHost}/ws/chat`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.onOpen) this.onOpen();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(data);
        } catch (err) {
          console.error('WS JSON parse error:', err);
        }
      };

      this.ws.onclose = () => {
        if (this.onClose) this.onClose();
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn('WS error on', wsUrl, err);
        if (this.ws) this.ws.close();
      };
    } catch (e) {
      console.warn('Failed to initialize WebSocket on', wsUrl, e);
    }
  }

  sendMessage(prompt, systemPrompt = '', preferences = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'user_message',
        prompt,
        system_prompt: systemPrompt,
        preferences
      }));
    }
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}

// ================= Creaciones & Evolución Progresiva APIs =================

export async function fetchCreationsCatalog() {
  return await apiFetch('/creations');
}

export async function fetchCreationDetails(creationId) {
  return await apiFetch(`/creations/${creationId}`);
}

export async function executeCreationSample(creationId, customCode = null) {
  return await apiFetch('/creations/execute_sample', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, custom_code: customCode })
  });
}

export async function forkCreationVersion(creationId, branchName, diffSummary, newContent, authorAgent = null) {
  return await apiFetch('/creations/fork_version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      branch_name: branchName,
      diff_summary: diffSummary,
      new_content: newContent,
      author_agent: authorAgent
    })
  });
}

export async function recycleCreationsStorage() {
  return await apiFetch('/creations/recycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
}

// ================= StarSeed OS Control & Smart Updates APIs =================

export async function fetchOSSystemStatus() {
  return await apiFetch('/system/os/status');
}

export async function checkStarSeedOSUpdates(channel = 'stable') {
  return await apiFetch('/system/os/check-updates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel })
  });
}

export async function installStarSeedOSUpdate(channel = 'stable', autoRestart = true) {
  return await apiFetch('/system/os/install-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, auto_restart: autoRestart })
  });
}

export async function modifyOSConfiguration(osType, modifications = {}, userPermissionsGranted = false, token = null) {
  return await apiFetch('/system/os/modify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      os_type: osType,
      modifications,
      user_permissions_granted: userPermissionsGranted,
      security_consent_token: token
    })
  });
}

export async function saveOSPreferences(preferences) {
  return await apiFetch('/system/os/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences })
  });
}

// ================= audio.cpp 1.58-Bit & Holographic Voice Matrix APIs =================

export async function fetchVoiceEngineStatus() {
  return await apiFetch('/voice/status');
}

export async function fetchVoiceModels() {
  return await apiFetch('/voice/models');
}

export async function fetchVoiceCognitiveOrgans() {
  return await apiFetch('/voice/organs');
}

export async function fetchVoiceHolographicMatrix() {
  return await apiFetch('/voice/matrix');
}

export async function synthesizeVoiceAudio(text, personaId = 'astraura_prime', voiceProfile = null, asBase64 = true) {
  return await apiFetch('/voice/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      persona_id: personaId,
      voice_profile: voiceProfile,
      as_base64: asBase64
    })
  });
}

export async function saveVoicePersonalityProfile(personaId, profile) {
  return await apiFetch('/voice/personality_profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persona_id: personaId,
      profile
    })
  });
}

export async function learnVoiceExpression(personaId, expression, emotion, acousticTweak = null) {
  return await apiFetch('/voice/learn_expression', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persona_id: personaId,
      expression,
      emotion,
      acoustic_tweak: acousticTweak
    })
  });
}

// ================= Continuous Ambient Voice Daemon & Sensory Perception APIs =================

export async function fetchVoiceDaemonStatus() {
  return await apiFetch('/voice/daemon/status');
}

export async function toggleMasterVoiceSwitch(switchKey, enabled) {
  return await apiFetch('/voice/daemon/toggle_master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      switch_key: switchKey,
      enabled
    })
  });
}

export async function togglePersonaVoiceSwitch(personaId, voiceEnabled = null, multiagentEnabled = null) {
  return await apiFetch('/voice/daemon/toggle_personality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persona_id: personaId,
      voice_enabled: voiceEnabled,
      multiagent_enabled: multiagentEnabled
    })
  });
}

export async function perceiveAmbientAudioAndRespond(userTranscript, acousticMetadata = null) {
  return await apiFetch('/voice/daemon/ambient_perceive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_transcript: userTranscript,
      acoustic_metadata: acousticMetadata
    })
  });
}




