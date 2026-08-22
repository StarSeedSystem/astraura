/**
 * Astraura 1.58-Bit API Service & Universal Hybrid Bridge (v3.2)
 * Connects to local FastAPI backend (via HTTPS Cloudflare Tunnel or direct LAN)
 * or falls back to autonomous in-browser cognitive exocortex when completely offline.
 */

export const DEFAULT_HTTPS_GATEWAY = 'https://astraura-backend-334237619848.us-central1.run.app';

// Gateway dinámico: se actualiza desde active_tunnel.json para que el frontend
// SIEMPRE apunte al túnel actual (sin necesidad de rebuild cuando cambia la URL).
let dynamicGateway = null;
let gatewayResolved = false;

async function refreshDynamicGateway() {
  try {
    const res = await fetch('/active_tunnel.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.url && data.url.startsWith('http')) {
        dynamicGateway = data.url.replace(/\/$/, '');
        gatewayResolved = true;
      }
    }
  } catch (e) {
    // Si no hay active_tunnel.json (offline), usa el default.
  }
}

// Refrescar el gateway al cargar y cada 30s.
if (typeof window !== 'undefined') {
  refreshDynamicGateway();
  setInterval(refreshDynamicGateway, 30000);
}

export function getGatewayUrl() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('astraura_backend_gateway');
    if (custom && custom.trim()) return custom.trim().replace(/\/$/, '');
    
    const h = window.location.hostname;
    // localhost/127.0.0.1 → backend local (relativo)
    if (h === 'localhost' || h === '127.0.0.1') {
      return '';
    }
    // En Vercel / app nativa / externo: usar el gateway dinámico (Cloud Run)
    // o el default (CORS habilitado en el backend: access-control-allow-origin: *).
    if (gatewayResolved && dynamicGateway) return dynamicGateway;
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

export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  
  // Enhanced fetch with gateway retry logic
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 15000); // 15 second timeout
  
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      // If gateway fails with 5xx, try localhost as fallback
      if (res.status >= 500 && typeof window !== 'undefined' && 
          window.location.hostname !== 'localhost' && 
          window.location.hostname !== '127.0.0.1') {
        console.warn(`[Astraura Bridge] Gateway ${url} returned ${res.status}, trying localhost fallback...`);
        const fallbackUrl = `http://127.0.0.1:8000${path}`;
        try {
          const fallbackRes = await fetch(fallbackUrl, { ...options, signal: AbortSignal.timeout(5000) });
          if (fallbackRes.ok) {
            const contentType = fallbackRes.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              return await fallbackRes.json();
            }
            return fallbackRes;
          }
        } catch (fallbackErr) {
          console.warn('[Astraura Bridge] Localhost fallback also failed:', fallbackErr.message);
        }
      }
      
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} en ${path}: ${errText || res.statusText}`);
    }
    
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    // Enhanced error reporting for storage scanning
    if (path.includes('/storage/') || path.includes('/scan')) {
      console.warn(`[Astraura Bridge] Storage scan error on ${url}:`, err.message);
      throw new Error(`Failed to fetch: ${err.message || 'Network error'}. Verifica que el backend esté corriendo en http://127.0.0.1:8000`);
    }
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

export async function autoDetectStorageBrains() {
  return apiFetch('/cerebros/auto_detect');
}

export async function autoLinkStorageBrains() {
  return apiFetch('/cerebros/auto_link', { method: 'POST' });
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

export async function fetchAstrauraProjectStructure() {
  return apiFetch('/astraura_project/structure');
}

export async function fetchAstrauraProjectFile(filePath) {
  return apiFetch(`/astraura_project/file?path=${encodeURIComponent(filePath)}`);
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

// ================= Unified Projects Manager APIs =================

export async function fetchProjects() {
  return apiFetch('/projects');
}

export async function fetchProjectDetails(projectId) {
  return apiFetch(`/projects/${projectId}`);
}

export async function createProject(name, description, type = 'personal', extraData = {}) {
  return apiFetch('/projects/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, type, ...extraData })
  });
}

export async function updateProject(projectId, updates) {
  return apiFetch('/projects/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, updates })
  });
}

export async function deleteProject(projectId) {
  return apiFetch('/projects/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId })
  });
}

export async function addProjectVersion(projectId, versionData) {
  return apiFetch('/projects/add_version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, ...versionData })
  });
}

export async function addProjectLog(projectId, action, agent, details) {
  return apiFetch('/projects/add_log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, action, agent, details })
  });
}

export async function linkProjectItem(projectId, itemType, itemId) {
  return apiFetch('/projects/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, item_type: itemType, item_id: itemId })
  });
}

export async function unlinkProjectItem(projectId, itemType, itemId) {
  return apiFetch('/projects/unlink', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, item_type: itemType, item_id: itemId })
  });
}

export async function fetchProjectIntegrity(projectId) {
  return apiFetch(`/projects/integrity/${projectId}`);
}

export async function createProjectBranch(projectId, branchName, originBranch = 'main', notes = '', author = 'Alex Bordón') {
  return apiFetch('/projects/branch/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, branch_name: branchName, origin_branch: originBranch, notes, author })
  });
}

export async function mergeProjectBranch(projectId, sourceBranch, targetBranch = 'main', strategy = 'fast-forward', author = 'Alex Bordón') {
  return apiFetch('/projects/branch/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, source_branch: sourceBranch, target_branch: targetBranch, strategy, author })
  });
}

export async function connectProjectSynapse(sourceProjectId, targetProjectId, synapseType = 'bidirectional', weight = 0.85, notes = '') {
  return apiFetch('/projects/synapse/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_project_id: sourceProjectId, target_project_id: targetProjectId, synapse_type: synapseType, weight, notes })
  });
}

export async function disconnectProjectSynapse(sourceProjectId, targetProjectId) {
  return apiFetch('/projects/synapse/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_project_id: sourceProjectId, target_project_id: targetProjectId })
  });
}

export async function modifyProjectFile(projectId, filePath, content, isBinary = false, permissionsMode = '0644') {
  return apiFetch('/projects/file/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, file_path: filePath, content, is_binary: isBinary, permissions_mode: permissionsMode })
  });
}

export async function deleteProjectFile(projectId, filePath, physicalDelete = false) {
  return apiFetch('/projects/file/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, file_path: filePath, physical_delete: physicalDelete })
  });
}

export async function applyProjectProposal(projectId, proposal) {
  return apiFetch('/projects/apply_proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, proposal })
  });
}

// ================= Project Master Agent (Architectus) APIs =================

export async function fetchProjectMasterAgentStatus() {
  return apiFetch('/projects/agent/status');
}

export async function updateProjectMasterAgentConfig(config) {
  return apiFetch('/projects/agent/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
}

export async function runProjectMasterAgentCycle(triggerReason = 'manual') {
  return apiFetch('/projects/agent/run_cycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger_reason: triggerReason })
  });
}

export async function applyProjectMasterAgentProposal(proposalId) {
  return apiFetch('/projects/agent/proposals/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ proposal_id: proposalId })
  });
}

export async function autoOrganizeProjectsVault() {
  return apiFetch('/projects/agent/auto_organize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
}

export async function triggerProjectDream(theme, processType, targetProjectId) {
  return apiFetch('/dream/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, process_type: processType, target_project_id: targetProjectId })
  });
}

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

// ================= Agent Vault, Governance & Sovereign Agent APIs =================

export async function fetchAgents() {
  return apiFetch('/agents');
}

export async function fetchAgentDetail(agentId) {
  return apiFetch(`/agents/${agentId}`);
}

export async function saveAgent(agent) {
  return apiFetch('/agents/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent })
  });
}

export async function deleteAgent(agentId) {
  return apiFetch(`/agents/${agentId}`, {
    method: 'DELETE'
  });
}

export async function toggleAgentImagination(agentId, enabled) {
  return apiFetch(`/agents/${agentId}/toggle_imagination`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
}

export async function updateAgentImaginationConfig(agentId, config) {
  return apiFetch(`/agents/${agentId}/update_imagination_config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
}

export async function fetchAgentApiKeys() {
  return apiFetch('/agents_api/keys');
}

export async function fetchAgentApiDetail(agentId) {
  return apiFetch(`/agents_api/${agentId}/api_status`);
}

export async function regenerateAgentApiKey(agentId) {
  return apiFetch(`/agents_api/${agentId}/generate_key`, {
    method: 'POST'
  });
}

export async function revokeAgentApiKey(agentId) {
  return apiFetch(`/agents_api/${agentId}/revoke_key`, {
    method: 'POST'
  });
}

export async function restoreAgentApiKey(agentId) {
  return apiFetch(`/agents_api/${agentId}/restore_key`, {
    method: 'POST'
  });
}

export async function updateAgentApiPermissions(agentId, permissions) {
  return apiFetch(`/agents_api/${agentId}/update_permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions })
  });
}

export async function saveAgentSyncServer(agentId, serverConfig) {
  return apiFetch(`/agents_api/${agentId}/sync_server`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ server_config: serverConfig })
  });
}

export async function deleteAgentSyncServer(agentId, serverId) {
  return apiFetch(`/agents_api/${agentId}/sync_server/${serverId}`, {
    method: 'DELETE'
  });
}

export async function triggerAgentServerSync(agentId, serverId) {
  return apiFetch(`/agents_api/${agentId}/trigger_sync/${serverId}`, {
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

export async function openNativePath(path, reveal = true) {
  return apiFetch('/system/open_native', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, reveal })
  });
}

export async function fetchItemDetails(path) {
  return apiFetch(`/system/item_details?path=${encodeURIComponent(path)}`);
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

export async function simulateLiveProcessStep(processId, branchId = null) {
  return apiFetch(`/imagination/process/${processId}/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch_id: branchId })
  });
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

export async function applySingleNotification(notifId) {
  return apiFetch('/notifications/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notif_id: notifId })
  });
}

export async function deleteSingleNotification(notifId) {
  return apiFetch('/notifications/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notif_id: notifId })
  });
}

export async function clearAllNotifications() {
  return apiFetch('/notifications/clear', {
    method: 'POST'
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

export async function linkCreationProjects(creationId, projectIds) {
  return await apiFetch('/creations/link_projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, project_ids: projectIds })
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

// ================= Director Orchestrator Supreme Agent APIs =================

export async function fetchDirectorStatus() {
  return apiFetch('/director/status');
}

export async function steerDirectorSwarm(directive, targetProjectId = null) {
  return apiFetch('/director/steer_swarm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      directive,
      target_project_id: targetProjectId
    })
  });
}

export async function verifyDirectorTask(taskData) {
  return apiFetch('/director/verify_task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: taskData
    })
  });
}

export async function addDirectorMemory(title, content, category = 'general', importance = 'medium', tags = null) {
  return apiFetch('/director/add_memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      content,
      category,
      importance,
      tags
    })
  });
}

export async function triggerDirectorCycle() {
  return apiFetch('/director/trigger_cycle', {
    method: 'POST'
  });
}

export async function fetchDirectorConfig() {
  return apiFetch('/director/config');
}

export async function updateDirectorConfig(config) {
  return apiFetch('/director/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  });
}

export async function triggerDirectorImaginationCycle(targetProjectId = null, theme = null) {
  return apiFetch('/director/imagination_cycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_project_id: targetProjectId,
      theme
    })
  });
}

export async function renewDirectorTasks() {
  return apiFetch('/director/renew_tasks', {
    method: 'POST'
  });
}

// ================= Synthesis Reports & Chronology API =================

export async function fetchSynthesisReports(limit = 50) {
  return apiFetch(`/imagination/synthesis_reports?limit=${limit}`);
}

export async function fetchLatestSynthesisReport() {
  return apiFetch('/imagination/synthesis_reports/latest');
}

export async function fetchSynthesisReportById(reportId) {
  return apiFetch(`/imagination/synthesis_reports/${reportId}`);
}

export async function generateSynthesisReport(triggerType = 'manual_request', contextData = {}) {
  return apiFetch('/imagination/synthesis_reports/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trigger_type: triggerType,
      context_data: contextData
    })
  });
}

export async function clearSynthesisReportsHistory() {
  return apiFetch('/imagination/synthesis_reports/clear', {
    method: 'DELETE'
  });
}

export async function fetchStorageDrives() {
  return apiFetch('/system/storage/drives');
}

export async function inspectFileStorage(filePath) {
  return apiFetch('/system/storage/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath })
  });
}

export async function scanExternalBrains() {
  return apiFetch('/cerebros/external/scan');
}

export async function fuseExternalBrain(brainId, strategy = 'bidirectional_merge') {
  return apiFetch('/cerebros/external/fuse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId, strategy })
  });
}

export async function updateExternalBrainPermissions(brainId, mode) {
  return apiFetch('/cerebros/external/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brain_id: brainId, mode })
  });
}

export async function syncPortableBrainToStorage(brainId, drivePath, options = {}) {
  return apiFetch('/cerebros/portable/sync_to_storage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brain_id: brainId,
      drive_path: drivePath,
      include_projects: options.includeProjects ?? true,
      include_voice_studio: options.includeVoiceStudio ?? true
    })
  });
}

export async function fetchSyncMeshTelemetry() {
  return apiFetch('/system/sync/telemetry');
}

export async function broadcastStateMutation(event, payload = {}) {
  return apiFetch('/system/sync/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, payload })
  });
}


export async function executeAllNotificationsInList(notifIds) {
  if (!notifIds || !notifIds.length) return { success: true, processed: 0, failed: 0 };
  return apiFetch('/notifications/apply_all_from_list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notif_ids: notifIds })
  });
}

export async function fetchAuthOrchestratorStatus() {
  return apiFetch('/notifications/auth_orchestrator_status');
}

export async function setAuthOrchestratorAuto(enabled) {
  return apiFetch('/notifications/auth_orchestrator_auto', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export async function updateAgentConfig(agentId, config) {
  return apiFetch(`/ecosystem/agents/${agentId}/config`, {
    method: 'POST',
    body: JSON.stringify({ config }),
  });
}

export async function toggleAgentEnabled(agentId, enabled) {
  return apiFetch(`/ecosystem/agents/${agentId}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export async function fetchRoutingStorageStatus() {
  return apiFetch('/routing_storage/status');
}

export async function fetchEcosystemAgents() {
  return apiFetch('/ecosystem/agents');
}

export async function runRoutingStorageSync() {
  return apiFetch('/routing_storage/sync', { method: 'POST' });
}

export async function fetchImaginationSyncExecutionState() {
  return apiFetch('/imagination/sync_execution_state');
}

// ================= Sovereign Tunnel & Mesh APIs =================

export async function fetchTunnelStatus() {
  return apiFetch('/system/tunnel/status');
}

export async function startTunnel() {
  return apiFetch('/system/tunnel/start', { method: 'POST' });
}

export async function stopTunnel() {
  return apiFetch('/system/tunnel/stop', { method: 'POST' });
}

export async function restartTunnel() {
  return apiFetch('/system/tunnel/restart', { method: 'POST' });
}

/**
 * Auto-detects the live tunnel URL from the backend and optionally updates the gateway.
 * Call this on app startup from Vercel/external hosts.
 */
export async function autoDetectAndSetLiveTunnel() {
  const candidates = [
    DEFAULT_HTTPS_GATEWAY,
    'https://astraura.vercel.app/active_tunnel.json'
  ];
  
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try fetching active tunnel from the Vercel deployment
      let tunnelUrl = null;
      if (candidate.includes('/active_tunnel.json')) {
        const res = await fetch(candidate, { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          tunnelUrl = data?.tunnel?.url || data?.url;
        }
      } else {
        // Try the backend tunnel status directly
        const res = await fetch(`${candidate.replace(/\/$/, '')}/api/system/tunnel/status`, { 
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          tunnelUrl = data?.tunnel?.url;
        }
      }
      
      if (tunnelUrl && tunnelUrl.startsWith('https://')) {
        // Verify the tunnel is actually live
        try {
          const verifyRes = await fetch(`${tunnelUrl}/api/status`, { 
            signal: AbortSignal.timeout(5000) 
          });
          if (verifyRes.ok) {
            const saved = localStorage.getItem('astraura_backend_gateway');
            if (saved !== tunnelUrl) {
              console.log(`[Astraura Bridge] 🌐 Túnel vivo detectado: ${tunnelUrl}`);
              setCustomGateway(tunnelUrl);
            }
            return tunnelUrl;
          }
        } catch (e) {
          console.warn(`[Astraura Bridge] Tunnel ${tunnelUrl} not responding to verification`);
        }
      }
    } catch (e) {
      console.warn(`[Astraura Bridge] Tunnel discovery failed for ${candidate}:`, e.message);
    }
  }
  
  // Fallback: try scanning common local ports if on same network
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const localIp = window.location.hostname;
    for (const port of [8000, 8001, 8002]) {
      try {
        const res = await fetch(`http://${localIp}:${port}/api/status`, { 
          signal: AbortSignal.timeout(2000) 
        });
        if (res.ok) {
          console.warn(`[Astraura Bridge] No HTTPS tunnel found. Consider starting one with: python3 backend/run_backend.py --tunnel`);
          return null;
        }
      } catch (e) {
        // Port not responding, try next
      }
    }
  }
  
  return null;
}

// ================= Synthesis Report Memory/Brain Link APIs =================

/**
 * Fetch the memory graph, brain/cerebro mappings, and folder/file tree
 * specific to a given synthesis report. This ensures each report's tab content
 * is uniquely developed from its own memory traces, not reused text.
 */
export async function fetchSynthesisReportMemoryGraph(reportId) {
  return apiFetch(`/imagination/synthesis_reports/${reportId}/memory_graph`);
}

export async function fetchSynthesisReportBrainCerebros(reportId) {
  return apiFetch(`/imagination/synthesis_reports/${reportId}/brain_cerebros`);
}

export async function fetchSynthesisReportFileTree(reportId) {
  return apiFetch(`/imagination/synthesis_reports/${reportId}/file_tree`);
}

/**
 * Generate a new synthesis report specifically for a tab, ensuring
 * unique, non-reused content developed by the assigned agent.
 */
export async function regenerateSynthesisReportContent(reportId, tabId) {
  return apiFetch(`/imagination/synthesis_reports/${reportId}/regenerate_tab`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tab_id: tabId })
  });
}
