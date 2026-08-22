import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  HardDrive, 
  Server, 
  Volume2, 
  Play, 
  Pause,
  FastForward,
  Target,
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  Lock, 
  Unlock, 
  FileText, 
  Copy, 
  Compass, 
  Radio, 
  Moon, 
  Cpu, 
  Activity, 
  User, 
  GitBranch, 
  Sliders, 
  CheckCircle2, 
  Orbit, 
  Bookmark, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Network, 
  FolderTree, 
  Folder, 
  FolderPlus, 
  Zap, 
  Cloud, 
  Database, 
  Key, 
  Eye, 
  Link2,
  Unlink,
  Share2,
  Workflow,
  ArrowRight,
  Terminal,
  X 
} from 'lucide-react';
import { 
  fetchCerebros, 
  activateBrain, 
  saveBrain, 
  deleteBrain,
  autoDetectStorageBrains,
  autoLinkStorageBrains,
  fetchBrainSynapticTree,
  attachBrainMemory,
  controlBrainProcess,
  autoLinkBrainSynapses,
  fetchStarSeedMemoryGraph,
  fetchOpenVikingMemory,
  fetchRecuerdos,
  saveRecuerdos,
  scanContextFolder,
  linkGDriveSource,
  deleteGDriveSource,
  syncBrainSources,
  scanLocalFolderViaPicker
} from '../services/api';
import { omniVoice } from '../services/omniVoice';

export default function CerebrosView() {
  const [cerebrosData, setCerebrosData] = useState({ cerebros: [], active_brain_id: 'brain_genesis', biological_regions: [] });
  const [selectedBrainId, setSelectedBrainId] = useState('brain_genesis');
  const [activeTab, setActiveTab] = useState('ramification2d');
  const [activeLayerKey, setActiveLayerKey] = useState('soul');
  const [isEditingLayer, setIsEditingLayer] = useState(false);
  const [layerContent, setLayerContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [synapticData, setSynapticData] = useState({ tree_2d: null, graph_3d: { nodes: [], edges: [] } });
  const [selectedNode, setSelectedNode] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);

  const [attachMemModal, setAttachMemModal] = useState(false);
  const [targetAgentForMem, setTargetAgentForMem] = useState(null);
  const [newMemForm, setNewMemForm] = useState({
    concept: '',
    definition: '',
    category: 'Axiomas & Ontocracia',
    resonance: 0.98
  });

  const [reorientModal, setReorientModal] = useState(false);
  const [targetAgentForReorient, setTargetAgentForReorient] = useState(null);
  const [newProcessTask, setNewProcessTask] = useState('');

  const [newFolderModal, setNewFolderModal] = useState(false);
  const [newFolderForm, setNewFolderForm] = useState({
    path: '',
    label: '',
    access_mode: 'read_write',
    resonance_weight: 90
  });

  const [newDestModal, setNewDestModal] = useState(false);
  const [newDestForm, setNewDestForm] = useState({
    name: '',
    type: 'local_fs',
    path: '',
    endpoint: '',
    sync_mode: 'realtime_fs_watcher'
  });

  const [newGDriveModal, setNewGDriveModal] = useState(false);
  const [newGDriveForm, setNewGDriveForm] = useState({
    url: '',
    label: '',
    access_permission: 'read_only_parameter',
    description: 'Referencias y documentos sincronizados como tokens de contexto 1.58b.'
  });

  const [newNeuronModal, setNewNeuronModal] = useState(false);
  const [newNeuronForm, setNewNeuronForm] = useState({
    name: '',
    type: 'associative_graph',
    lobe: 'Hipocampo',
    color: '#00f0ff',
    resonance_weight: 85,
    sync_policy: 'realtime_push',
    modification_permission: 'read_write_modify',
    description: ''
  });

  const [newBrainModal, setNewBrainModal] = useState(false);
  const [newBrainForm, setNewBrainForm] = useState({
    name: '',
    role: '',
    color: '#00f0ff',
    active_persona: 'astraura_prime'
  });
  const [detectedBrains, setDetectedBrains] = useState([]);
  const [detecting, setDetecting] = useState(false);

  const handleAutoLink = async () => {
    try {
      const res = await autoLinkStorageBrains();
      if (res && res.success && res.linked_count > 0) {
        const fresh = await fetchCerebros();
        setCerebrosData(fresh);
        setToastMessage(`✅ ${res.linked_count} cerebro(s) vinculado(s) automáticamente desde almacenamientos conectados`);
        setTimeout(() => setToastMessage(''), 4000);
      }
    } catch (e) {
      // Silencioso: la vinculación automática es en segundo plano
    }
  };
  const handleAutoDetect = async () => {
    setDetecting(true);
    try {
      const res = await autoDetectStorageBrains();
      if (res && res.detected) setDetectedBrains(res.detected);
      if (res && res.detected && res.detected.length > 0) {
        setToastMessage(`🔍 ${res.detected.length} cerebro(s) detectado(s) en almacenamientos conectados`);
      } else {
        setToastMessage('🔍 No se detectaron cerebros externos nuevos');
      }
    } catch (e) {
      setToastMessage('Error al detectar almacenamientos');
    } finally {
      setDetecting(false);
      setTimeout(() => setToastMessage(''), 4000);
    }
  };
  const cameraRef = useRef({
    rotX: 0.2,
    rotY: 0,
    distance: 420,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    panX: 0,
    panY: 0
  });

  const pulsesRef = useRef([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchCerebros();
      setCerebrosData(res);
      if (res.cerebros && res.cerebros.length > 0) {
        const currentSelected = selectedBrainId || res.active_brain_id || res.cerebros[0].id;
        setSelectedBrainId(currentSelected);
        
        try {
          const treeRes = await fetchBrainSynapticTree(currentSelected);
          if (treeRes && treeRes.success) {
            setSynapticData({
              tree_2d: treeRes.tree_2d,
              graph_3d: treeRes.graph_3d
            });
          }
        } catch (e) {
          console.warn('Synaptic tree fetch fallback:', e);
        }

        const b = res.cerebros.find(x => x.id === currentSelected) || res.cerebros[0];
        if (b && b.md_layers) {
          setLayerContent(b.md_layers[activeLayerKey] || '');
        }
      }
    } catch (e) {
      console.error('Error loading cerebros data:', e);
      showToast('Error cargando cerebros multidimensionales');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Agente de sincronización: vincular automáticamente cerebros de
    // almacenamientos conectados al abrir la vista (mismo sistema multi-medio).
    handleAutoLink();
  }, []);

  useEffect(() => {
    if (selectedBrainId) {
      const b = cerebrosData.cerebros?.find(x => x.id === selectedBrainId);
      if (b && b.md_layers) {
        setLayerContent(b.md_layers[activeLayerKey] || '');
      }
      fetchBrainSynapticTree(selectedBrainId).then(treeRes => {
        if (treeRes && treeRes.success) {
          setSynapticData({
            tree_2d: treeRes.tree_2d,
            graph_3d: treeRes.graph_3d
          });
        }
      }).catch(err => console.warn('Synaptic update err:', err));
    }
  }, [selectedBrainId, activeLayerKey]);

  const currentBrain = cerebrosData.cerebros?.find(b => b.id === selectedBrainId) || cerebrosData.cerebros?.[0];

  useEffect(() => {
    if (activeTab !== 'graph3d' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement.clientHeight || 550);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const nodes = synapticData.graph_3d?.nodes || [];
    const edges = synapticData.graph_3d?.edges || [];

    pulsesRef.current = edges.map((e, idx) => ({
      edgeIndex: idx,
      progress: (idx * 0.2) % 1.0,
      speed: 0.008 + (idx % 3) * 0.004,
      color: e.color || '#00f0ff'
    }));

    let animationId;

    const render3D = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      if (autoRotate && !cameraRef.current.isDragging) {
        cameraRef.current.rotY += 0.003;
      }

      const { rotX, rotY, distance, panX, panY } = cameraRef.current;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      const projected = [];
      const nodeMap = new Map();

      nodes.forEach((node) => {
        const nx = node.x || 0;
        const ny = node.y || 0;
        const nz = node.z || 0;

        let x1 = nx * cosY - nz * sinY;
        let z1 = nz * cosY + nx * sinY;
        let y1 = ny * cosX - z1 * sinX;
        let z2 = z1 * cosX + ny * sinX;

        const fov = 420;
        const scale = fov / (fov + z2 + distance);
        const projX = width / 2 + x1 * scale + panX;
        const projY = height / 2 + y1 * scale + panY;

        const pNode = {
          ...node,
          projX,
          projY,
          projZ: z2,
          scale,
          visible: scale > 0
        };
        projected.push(pNode);
        nodeMap.set(node.id, pNode);
      });

      projected.sort((a, b) => b.projZ - a.projZ);

      edges.forEach((edge) => {
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);

        if (s && t && s.visible && t.visible) {
          ctx.beginPath();
          ctx.moveTo(s.projX, s.projY);
          ctx.lineTo(t.projX, t.projY);

          const alpha = Math.max(0.15, Math.min(0.7, (s.scale + t.scale) / 2));
          ctx.strokeStyle = edge.color ? `${edge.color}66` : `rgba(0, 240, 255, ${alpha * 0.5})`;
          ctx.lineWidth = Math.max(1, 1.8 * ((s.scale + t.scale) / 2));
          ctx.stroke();
        }
      });

      pulsesRef.current.forEach((pulse) => {
        pulse.progress += pulse.speed;
        if (pulse.progress > 1.0) pulse.progress = 0;

        const edge = edges[pulse.edgeIndex];
        if (!edge) return;
        const s = nodeMap.get(edge.source);
        const t = nodeMap.get(edge.target);

        if (s && t && s.visible && t.visible) {
          const px = s.projX + (t.projX - s.projX) * pulse.progress;
          const py = s.projY + (t.projY - s.projY) * pulse.progress;
          const pScale = (s.scale + t.scale) / 2;

          ctx.save();
          ctx.shadowColor = pulse.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, 3.5 * pScale), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.restore();
        }
      });

      projected.forEach((node) => {
        if (!node.visible) return;

        const isSelected = selectedNode?.id === node.id;
        const baseRadius = node.type === 'brain_root' ? 14 : node.type === 'personality' ? 10 : node.type === 'active_agent' ? 8 : 6;
        const r = Math.max(3, baseRadius * node.scale * (isSelected ? 1.5 : 1.0));

        ctx.save();
        ctx.shadowColor = node.color || '#00f0ff';
        ctx.shadowBlur = isSelected ? 28 : (node.type === 'brain_root' ? 20 : 10) * node.scale;

        ctx.beginPath();
        ctx.arc(node.projX, node.projY, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#00f0ff';
        ctx.fill();

        ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = isSelected ? 2.5 : 1.0;
        ctx.stroke();

        if (node.scale > 0.5 || isSelected || node.type === 'brain_root' || node.type === 'personality') {
          ctx.shadowBlur = 0;
          ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(241, 245, 249, 0.9)';
          ctx.font = `${Math.max(9, Math.round(11 * node.scale))}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label || '', node.projX, node.projY + r + 11);
        }

        ctx.restore();
      });

      animationId = requestAnimationFrame(render3D);
    };

    render3D();

    const handleMouseDown = (e) => {
      cameraRef.current.isDragging = true;
      cameraRef.current.lastMouseX = e.clientX;
      cameraRef.current.lastMouseY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!cameraRef.current.isDragging) return;
      const dx = e.clientX - cameraRef.current.lastMouseX;
      const dy = e.clientY - cameraRef.current.lastMouseY;
      cameraRef.current.rotY += dx * 0.005;
      cameraRef.current.rotX += dy * 0.005;
      cameraRef.current.lastMouseX = e.clientX;
      cameraRef.current.lastMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      cameraRef.current.isDragging = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      cameraRef.current.distance = Math.max(120, Math.min(900, cameraRef.current.distance + e.deltaY * 0.4));
    };

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const nodes = synapticData.graph_3d?.nodes || [];
      const { rotX, rotY, distance, panX, panY } = cameraRef.current;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);

      let found = null;
      nodes.forEach((node) => {
        let x1 = (node.x || 0) * cosY - (node.z || 0) * sinY;
        let z1 = (node.z || 0) * cosY + (node.x || 0) * sinY;
        let y1 = (node.y || 0) * cosX - z1 * sinX;
        let z2 = z1 * cosX + (node.y || 0) * sinX;

        const fov = 420;
        const scale = fov / (fov + z2 + distance);
        const projX = width / 2 + x1 * scale + panX;
        const projY = height / 2 + y1 * scale + panY;

        const dist = Math.hypot(clickX - projX, clickY - projY);
        if (dist < 18) {
          found = node;
        }
      });

      setSelectedNode(found);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('click', handleClick);
    };
  }, [activeTab, synapticData, autoRotate, selectedNode]);

  const handleActivateBrain = async (brainId) => {
    try {
      await activateBrain(brainId);
      await loadData();
      showToast(`Cerebro '${brainId}' activado como soberano`);
    } catch (e) {
      console.error(e);
      showToast('Error activando cerebro');
    }
  };

  const handleDeleteBrain = async (brainId) => {
    if (brainId === 'brain_genesis') {
      alert('El Cerebro Génesis es inmutable y no puede ser eliminado.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar el cerebro '${brainId}'?`)) {
      try {
        await deleteBrain(brainId);
        await loadData();
        setSelectedBrainId('brain_genesis');
        showToast('Cerebro eliminado');
      } catch (e) {
        console.error(e);
        showToast('Error eliminando cerebro');
      }
    }
  };

  const handleSaveCurrentLayer = async () => {
    if (!currentBrain) return;
    try {
      setIsSaving(true);
      const updatedBrain = {
        ...currentBrain,
        md_layers: {
          ...(currentBrain.md_layers || {}),
          [activeLayerKey]: layerContent
        }
      };
      await saveBrain(updatedBrain);
      setIsEditingLayer(false);
      await loadData();
      showToast(`Capa '${activeLayerKey}.md' guardada`);
    } catch (e) {
      console.error(e);
      showToast('Error guardando capa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessAction = async (agentId, action, params = {}) => {
    if (!currentBrain) return;
    try {
      const res = await controlBrainProcess(currentBrain.id, agentId, action, params);
      if (res && res.success) {
        showToast(`⚡ Acción '${action}' ejecutada en ${res.agent?.name || agentId}`);
        await loadData();
      }
    } catch (err) {
      alert(`Error en control de proceso: ${err.message}`);
    }
  };

  const handleAutoLinkSynapses = async () => {
    if (!currentBrain) return;
    try {
      showToast('⚡ Ejecutando Auto-Vinculación Heurística Cuántica...');
      const res = await autoLinkBrainSynapses(currentBrain.id);
      if (res && res.success) {
        await loadData();
        showToast(`✅ Entrelazamiento completado (${res.linked_count} sinapsis sincronizadas)`);
      }
    } catch (err) {
      alert(`Error en auto-vinculación: ${err.message}`);
    }
  };

  const handleAttachMemorySubmit = async () => {
    if (!currentBrain || !newMemForm.concept.trim()) return;
    try {
      await attachBrainMemory(
        currentBrain.id,
        newMemForm,
        targetAgentForMem?.personality_id,
        targetAgentForMem?.agent_id
      );
      setAttachMemModal(false);
      setNewMemForm({ concept: '', definition: '', category: 'Axiomas & Ontocracia', resonance: 0.98 });
      await loadData();
      showToast(`Memoria '${newMemForm.concept}' adjuntada con éxito`);
    } catch (err) {
      alert(`Error adjuntando memoria: ${err.message}`);
    }
  };

  const handleReorientSubmit = async () => {
    if (!currentBrain || !targetAgentForReorient || !newProcessTask.trim()) return;
    await handleProcessAction(targetAgentForReorient.agent_id, 'reorient', { new_process: newProcessTask });
    setReorientModal(false);
    setNewProcessTask('');
  };

  const handleLinkGoogleDrive = async () => {
    if (!currentBrain || !newGDriveForm.url.trim()) return;
    try {
      const gdriveSource = {
        id: `gdrive_${Date.now()}`,
        url: newGDriveForm.url.trim(),
        label: newGDriveForm.label.trim() || `Google Drive // ${newGDriveForm.url.slice(-16)}`,
        access_permission: newGDriveForm.access_permission,
        description: newGDriveForm.description,
        files_count: 14,
        token_weight: 1400,
        enabled: true
      };
      await linkGDriveSource(currentBrain.id, gdriveSource);
      setNewGDriveModal(false);
      setNewGDriveForm({
        url: '',
        label: '',
        access_permission: 'read_only_parameter',
        description: 'Referencias y documentos sincronizados como tokens de contexto 1.58b.'
      });
      await loadData();
      showToast('Enlace de Google Drive vinculado con éxito');
    } catch (err) {
      alert(`Error vinculando Google Drive: ${err.message}`);
    }
  };

  const handleDeleteGoogleDrive = async (sourceId) => {
    if (!currentBrain) return;
    try {
      await deleteGDriveSource(currentBrain.id, sourceId);
      await loadData();
      showToast('Fuente de Google Drive desvinculada');
    } catch (err) {
      alert(`Error eliminando fuente: ${err.message}`);
    }
  };

  const handleSyncAllSources = async () => {
    if (!currentBrain) return;
    try {
      const res = await syncBrainSources(currentBrain.id);
      await loadData();
      showToast(`⚡ Fuentes sincronizadas (${res.google_drive_sources_count || 0} GDrive, ${res.context_folders_count || 0} Carpetas)`);
    } catch (err) {
      alert(`Error sincronizando fuentes: ${err.message}`);
    }
  };

  const handleAddContextFolder = async () => {
    if (!currentBrain || !newFolderForm.path.trim()) return;
    try {
      const scanRes = await scanContextFolder(newFolderForm.path);
      const newF = {
        id: `ctx_${Date.now()}`,
        path: newFolderForm.path,
        label: newFolderForm.label || newFolderForm.path.split('/').pop() || 'Carpeta',
        access_mode: newFolderForm.access_mode,
        resonance_weight: parseInt(newFolderForm.resonance_weight) || 90,
        enabled: true,
        metrics: scanRes.metrics || {}
      };
      const updatedBrain = {
        ...currentBrain,
        context_folders: [...(currentBrain.context_folders || []), newF]
      };
      await saveBrain(updatedBrain);
      setNewFolderModal(false);
      setNewFolderForm({ path: '', label: '', access_mode: 'read_write', resonance_weight: 90 });
      await loadData();
      showToast(`Carpeta '${newF.label}' indexada`);
    } catch (e) {
      console.error(e);
      showToast('Error indexando carpeta');
    }
  };

  const handleNativeFolderPicker = async () => {
    if (!currentBrain) return;
    try {
      showToast('Abriendo selector de carpetas del sistema...');
      const scanRes = await scanLocalFolderViaPicker();
      if (scanRes && scanRes.success) {
        const newF = {
          id: `ctx_native_${Date.now()}`,
          path: scanRes.folder_name,
          label: scanRes.folder_name,
          access_mode: 'read_write',
          resonance_weight: 95,
          enabled: true,
          metrics: {
            total_files: scanRes.total_files,
            status: 'Indexado en memoria 1.58b',
            file_sample: scanRes.files.slice(0, 8).map(f => f.filename)
          }
        };
        const updatedBrain = {
          ...currentBrain,
          context_folders: [...(currentBrain.context_folders || []), newF]
        };
        await saveBrain(updatedBrain);
        await loadData();
        showToast(`✅ Carpeta '${scanRes.folder_name}' (${scanRes.total_files} archivos) vinculada`);
      }
    } catch (e) {
      console.warn(e);
      alert(`Acceso a carpeta: ${e.message}`);
    }
  };

  const handleDeleteContextFolder = async (folderId) => {
    if (!currentBrain) return;
    const updatedFolders = (currentBrain.context_folders || []).filter(f => f.id !== folderId);
    const updatedBrain = { ...currentBrain, context_folders: updatedFolders };
    await saveBrain(updatedBrain);
    await loadData();
    showToast('Carpeta desvinculada');
  };

  const handleAddDestination = async () => {
    if (!currentBrain || !newDestForm.name.trim()) return;
    const newD = {
      id: `dest_${Date.now()}`,
      name: newDestForm.name,
      type: newDestForm.type,
      path: newDestForm.path || undefined,
      endpoint: newDestForm.endpoint || undefined,
      is_primary: false,
      sync_mode: newDestForm.sync_mode,
      enabled: true,
      description: 'Fuente de almacenamiento vinculada.'
    };
    const updatedBrain = {
      ...currentBrain,
      storage_destinations: [...(currentBrain.storage_destinations || []), newD]
    };
    await saveBrain(updatedBrain);
    setNewDestModal(false);
    setNewDestForm({ name: '', type: 'local_fs', path: '', endpoint: '', sync_mode: 'realtime_fs_watcher' });
    await loadData();
    showToast(`Fuente '${newD.name}' añadida`);
  };

  const handleAddNeuron = async () => {
    if (!currentBrain || !newNeuronForm.name.trim()) return;
    const newN = {
      id: `neuron_${Date.now()}`,
      name: newNeuronForm.name,
      type: newNeuronForm.type,
      lobe: newNeuronForm.lobe,
      color: newNeuronForm.color,
      resonance_weight: parseInt(newNeuronForm.resonance_weight) || 85,
      enabled: true,
      sync_policy: newNeuronForm.sync_policy,
      modification_permission: newNeuronForm.modification_permission,
      allowed_personalities: ['*'],
      access_media: ['chat_integration', 'agent_swarm', 'dream_engine', 'direct_api'],
      storage_sources: ['local_fs', 'mem0_vault'],
      description: newNeuronForm.description || 'Neurona sináptica personalizada.'
    };
    const updatedBrain = {
      ...currentBrain,
      memory_neurons: [...(currentBrain.memory_neurons || []), newN]
    };
    await saveBrain(updatedBrain);
    setNewNeuronModal(false);
    setNewNeuronForm({
      name: '',
      type: 'associative_graph',
      lobe: 'Hipocampo',
      color: '#00f0ff',
      resonance_weight: 85,
      sync_policy: 'realtime_push',
      modification_permission: 'read_write_modify',
      description: ''
    });
    await loadData();
    showToast(`Neurona '${newN.name}' creada`);
  };

  const biologicalLayers = [
    { key: 'soul', name: 'soul.md', region: 'Córtex Prefrontal (Valores & Ontocracia)', color: '#00f0ff' },
    { key: 'ego', name: 'ego.md', region: 'Córtex Frontal (Identidad & Ego)', color: '#a855f7' },
    { key: 'personality', name: 'personality.md', region: 'Sistema Límbico (Psicología & Temperamento)', color: '#ec4899' },
    { key: 'style', name: 'style.md', region: 'Córtex Visual/Auditivo (Estética Hermes & Tono)', color: '#f43f5e' },
    { key: 'skills', name: 'skills.md', region: 'Cerebelo & Ganglios Basales (Procedimientos & Shell)', color: '#10b981' },
    { key: 'memory', name: 'memory.md', region: 'Hipocampo (Exocórtex & Grafos Asociativos)', color: '#3b82f6' },
    { key: 'dream', name: 'dream.md', region: 'Red Neuronal por Defecto (Imaginación Onírica)', color: '#8b5cf6' },
    { key: 'accounts', name: 'accounts.md', region: 'Córtex de Asociación (Cuentas & Conexiones)', color: '#f59e0b' },
    { key: 'tasks', name: 'tasks.md', region: 'Córtex Motor (Metas Ejecutivas & Tareas)', color: '#06b6d4' },
    { key: 'logs', name: 'logs.md', region: 'Tronco Encefálico & Tálamo (Sensorium & Telemetría)', color: '#64748b' }
  ];

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden font-sans">
      {/* Header Banner */}
      <div className="p-4 bg-[#0d1017]/95 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#07090e] rounded-[11px] flex items-center justify-center">
              <Brain className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              CEREBROS MULTIDIMENSIONALES & SINAPSIS DE MEMORIA
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                StarSeed Cognitive Core
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {cerebrosData.cerebros?.length || 0} cerebros interconectados | Personalidades enlazadas, agentes con medio de origen y ramificación 2D/3D
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {toastMessage && (
            <span className="text-xs px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono animate-fade-in">
              {toastMessage}
            </span>
          )}
          <button
            onClick={handleAutoLinkSynapses}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Entrelazar automáticamente memorias huérfanas y procesos"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Vinculación
          </button>
          <button
            onClick={() => setNewBrainModal(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear Cerebro
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 overflow-hidden">
        {/* Brains List Sidebar */}
        <div className="bg-[#0a0d15]/95 border border-white/10 rounded-2xl p-3 flex flex-col space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Cerebros del Sistema
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono">
              {cerebrosData.cerebros?.length || 0}
            </span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto pr-1">
            {cerebrosData.cerebros?.map((brain) => {
              const isSelected = selectedBrainId === brain.id;
              const isActive = cerebrosData.active_brain_id === brain.id;

              return (
                <div
                  key={brain.id}
                  onClick={() => setSelectedBrainId(brain.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                      : 'bg-white/5 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold"
                      style={{ backgroundColor: `${brain.color}25`, color: brain.color }}
                    >
                      {brain.scope}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Soberano
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateBrain(brain.id);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 font-mono transition-all"
                      >
                        Activar
                      </button>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white truncate">{brain.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{brain.role}</p>

                  <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-cyan-400/80">
                      {brain.linked_personalities?.length || 1} Personas • {brain.active_agents?.length || 1} Agentes
                    </span>
                    {brain.id !== 'brain_genesis' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBrain(brain.id);
                        }}
                        className="text-rose-400 hover:text-rose-300 p-0.5"
                        title="Eliminar cerebro"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Brain Workspace */}
        {currentBrain ? (
          <div className="lg:col-span-3 bg-[#0d1017]/95 border border-white/10 rounded-2xl p-4 flex flex-col space-y-3 overflow-hidden shadow-xl">
            {/* Top Brain Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full animate-pulse shadow-md"
                    style={{ backgroundColor: currentBrain.color }}
                  />
                  <h3 className="text-sm font-bold text-white">{currentBrain.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{currentBrain.role}</p>
              </div>

              {/* SubTabs Navigation */}
              <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl overflow-x-auto max-w-full">
                <button
                  onClick={() => setActiveTab('ramification2d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'ramification2d' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  🌳 Ramificación 2D & Procesos
                </button>
                <button
                  onClick={() => setActiveTab('graph3d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'graph3d' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Orbit className="w-3.5 h-3.5" />
                  🧠 Grafo Sináptico 3D
                </button>
                <button
                  onClick={() => setActiveTab('personalities')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'personalities' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  🎭 Personalidades & Agentes
                </button>
                <button
                  onClick={() => setActiveTab('layers')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'layers' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Capas .md
                </button>
                <button
                  onClick={() => setActiveTab('neurons')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'neurons' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Neuronas ({currentBrain.memory_neurons?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('storage_sync')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'storage_sync' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  Fuentes & GDrive
                </button>
                <button
                  onClick={() => setActiveTab('folders')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'folders' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  Folders ({currentBrain.context_folders?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'voice' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Voz
                </button>
              </div>
            </div>

            {/* TAB 1: 🌳 RAMIFICACIÓN 2D & PROCESOS ACTIVOS */}
            {activeTab === 'ramification2d' && (
              <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-cyan-400" />
                      Árbol Ramificado: Personalidades ➔ Agentes ➔ Procesos ➔ Memorias 3D
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Administración activa de procesos en vivo, sincronización de memorias y telemetría de hardware por medio de origen.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTargetAgentForMem(currentBrain.active_agents?.[0] || null);
                        setAttachMemModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-cyan-500/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adjuntar Memoria
                    </button>
                    <button
                      onClick={handleAutoLinkSynapses}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-purple-500/30"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-Vincular
                    </button>
                  </div>
                </div>

                <div className="space-y-4 font-mono">
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0d1626] to-[#0a101d] border border-cyan-500/40 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                        <Brain className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{currentBrain.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {currentBrain.scope.toUpperCase()} • {currentBrain.role}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                      NODO RAÍZ SOBERANO
                    </span>
                  </div>

                  <div className="pl-6 space-y-4 border-l-2 border-cyan-500/20 ml-4">
                    {(synapticData.tree_2d?.personalities || currentBrain.linked_personalities || []).map((persona) => (
                      <div key={persona.id} className="space-y-3">
                        <div className="p-3 rounded-xl bg-white/[0.04] border border-purple-500/30 flex flex-wrap items-center justify-between gap-2 shadow-sm">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: `${persona.color || '#fbbf24'}20`, border: `1px solid ${persona.color || '#fbbf24'}40` }}
                            >
                              <User className="w-3.5 h-3.5" style={{ color: persona.color || '#fbbf24' }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-white">{persona.name}</h5>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                                  {persona.archetype}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">{persona.role}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-[10px]">
                            <div className="flex items-center gap-1 text-slate-300 bg-black/40 px-2 py-0.5 rounded">
                              <Volume2 className="w-3 h-3 text-amber-400" />
                              <span>{persona.voice_id || 'OmniVoice'}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {persona.status === 'active' ? '● Enlazada Activa' : '○ Sincronizada'}
                            </span>
                          </div>
                        </div>

                        <div className="pl-6 space-y-3 border-l-2 border-purple-500/20 ml-3">
                          {(persona.agents || currentBrain.active_agents || []).map((agent) => (
                            <div key={agent.agent_id} className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-3 shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                    <Cpu className="w-3 h-3 text-emerald-400" />
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-white">{agent.name}</span>
                                    <span className="text-[10px] text-slate-400 block">{agent.role}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold flex items-center gap-1">
                                    <Radio className="w-2.5 h-2.5" />
                                    {agent.media_source}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                                    {agent.cpu_cores_allocated} Núcleos M1
                                  </span>
                                </div>
                              </div>

                              {/* Used Personalities on this Agent */}
                              <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-black/40 border border-purple-500/20">
                                <span className="text-[9px] text-purple-300 font-bold flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                                  Personalidades:
                                </span>
                                {(agent.used_personalities || [
                                  { name: persona.name, archetype: persona.archetype, color: persona.color }
                                ]).map((pers, persIdx) => (
                                  <span
                                    key={persIdx}
                                    className="text-[9px] px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1"
                                    style={{ backgroundColor: `${pers.color || '#a855f7'}15`, borderColor: `${pers.color || '#a855f7'}30`, color: pers.color || '#a855f7' }}
                                  >
                                    <span className="w-1 h-1 rounded-full" style={{ backgroundColor: pers.color || '#a855f7' }} />
                                    <span>{pers.name}</span>
                                    <span className="text-[8px] opacity-70">({pers.archetype?.split(' ')[0] || 'Voz'})</span>
                                  </span>
                                ))}
                              </div>

                              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-1.5 text-pink-300 font-bold">
                                    <Activity className="w-3 h-3 animate-spin" />
                                    <span>Proceso en Curso:</span>
                                    <span className="text-slate-200 font-normal truncate max-w-xs">{agent.active_process}</span>
                                  </div>
                                  <span className="text-cyan-300 font-bold">{agent.progress_percent}%</span>
                                </div>

                                <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500"
                                    style={{ width: `${agent.progress_percent}%` }}
                                  />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex items-center gap-1.5">
                                    {agent.status === 'working' ? (
                                      <button
                                        onClick={() => handleProcessAction(agent.agent_id, 'pause')}
                                        className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1 transition-all"
                                      >
                                        <Pause className="w-3 h-3" />
                                        Pausar
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleProcessAction(agent.agent_id, 'resume')}
                                        className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] flex items-center gap-1 transition-all"
                                      >
                                        <Play className="w-3 h-3" />
                                        Reanudar
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleProcessAction(agent.agent_id, 'accelerate')}
                                      className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] flex items-center gap-1 transition-all"
                                      title="Asignar más núcleos M1 e incrementar velocidad"
                                    >
                                      <FastForward className="w-3 h-3" />
                                      Acelerar M1
                                    </button>

                                    <button
                                      onClick={() => {
                                        setTargetAgentForReorient(agent);
                                        setNewProcessTask(agent.active_process || '');
                                        setReorientModal(true);
                                      }}
                                      className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] flex items-center gap-1 transition-all"
                                    >
                                      <Target className="w-3 h-3" />
                                      Reorientar
                                    </button>
                                  </div>

                                  <div className="text-[10px] text-slate-500">
                                    Última sinapsis: {agent.last_synapse_time || 'Hace 1s'}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="flex items-center gap-1 font-bold text-slate-300">
                                    <Orbit className="w-3 h-3 text-purple-400" />
                                    Memorias StarSeed Vinculadas ({agent.associated_memories?.length || 0}):
                                  </span>
                                  <button
                                    onClick={() => {
                                      setTargetAgentForMem(agent);
                                      setAttachMemModal(true);
                                    }}
                                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    Adjuntar
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(agent.associated_memories || []).map((mem, mIdx) => (
                                    <div
                                      key={mem.id || mIdx}
                                      className="p-2 rounded-lg bg-black/40 border border-purple-500/20 flex items-center justify-between gap-2"
                                    >
                                      <div className="truncate">
                                        <span className="text-[11px] text-purple-200 font-bold block truncate">
                                          {mem.concept}
                                        </span>
                                        <span className="text-[9px] text-slate-400">
                                          {mem.category} • Resonancia: {Math.round((mem.resonance || 0.95) * 100)}%
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleProcessAction(agent.agent_id, 'unlink_memory', { memory_id: mem.id })}
                                        className="text-slate-500 hover:text-rose-400 p-1"
                                        title="Desvincular memoria"
                                      >
                                        <Unlink className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 🧠 GRAFO SINÁPTICO 3D */}
            {activeTab === 'graph3d' && (
              <div className="flex-1 bg-black/40 rounded-xl relative overflow-hidden flex flex-col border border-white/5">
                <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing flex-1" />

                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md p-1.5 rounded-xl border border-white/10 font-mono text-[11px]">
                  <span className="text-white font-bold flex items-center gap-1 px-2">
                    <Orbit className="w-3.5 h-3.5 text-pink-400 animate-spin" />
                    Holograma Sináptico 3D
                  </span>
                  <button
                    onClick={() => setAutoRotate(!autoRotate)}
                    className={`px-2 py-1 rounded-lg transition-all ${
                      autoRotate ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rotación: {autoRotate ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => {
                      cameraRef.current.rotX = 0.2;
                      cameraRef.current.rotY = 0;
                      cameraRef.current.distance = 420;
                    }}
                    className="px-2 py-1 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Centrar
                  </button>
                </div>

                {selectedNode && (
                  <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-[#090d16]/90 backdrop-blur-md border border-cyan-500/40 p-3 rounded-xl space-y-1.5 shadow-2xl font-mono text-xs animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                        <h5 className="font-bold text-white">{selectedNode.label}</h5>
                      </div>
                      <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-cyan-300 uppercase block">Tipo: {selectedNode.type}</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {selectedNode.details?.role || selectedNode.details?.process_name || selectedNode.details?.concept || selectedNode.details?.description || 'Nodo holográfico interconectado.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: 🎭 PERSONALIDADES & AGENTES */}
            {activeTab === 'personalities' && (
              <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" />
                      Personalidades Enlazadas & Gobernanza de {currentBrain.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Arquetipos ontocráticos, tonalidad vocal OmniVoice y mando multiagéntico soberano.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(currentBrain.linked_personalities || []).map((persona) => (
                    <div
                      key={persona.id}
                      className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${persona.color || '#fbbf24'}20`, border: `1px solid ${persona.color || '#fbbf24'}40` }}
                          >
                            <User className="w-4 h-4" style={{ color: persona.color || '#fbbf24' }} />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-white">{persona.name}</h5>
                            <span className="text-[10px] text-purple-300 font-mono">{persona.archetype}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                            persona.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {persona.status === 'active' ? 'Principal Activa' : 'Enlazada'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">{persona.role}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {(persona.traits || []).map((trait, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300 font-mono"
                          >
                            #{trait}
                          </span>
                        ))}
                      </div>

                      {/* Multidimensional Linkages */}
                      <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-2 text-[10px] font-mono">
                        {/* Linked Agents */}
                        <div className="space-y-1">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Cpu className="w-3 h-3 text-cyan-400" />
                            Agentes Vinculados:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(persona.linked_agents || [
                              { name: `${persona.name}-CoreAgent`, media: '⚡ Local ARM64 NEON Core', role: persona.role }
                            ]).map((ag, agIdx) => (
                              <span
                                key={agIdx}
                                className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 flex items-center gap-1"
                                title={`${ag.role || ''} // ${ag.media || ''}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                <b className="font-sans">{ag.name}</b>
                                <span className="text-[8px] text-slate-400 font-mono">({ag.media?.split(' ')[0] || 'Local'})</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Linked Processes */}
                        <div className="space-y-1 pt-1 border-t border-white/5">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-emerald-400" />
                            Procesos Vinculados:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(persona.linked_processes || [
                              { name: 'Modelado Predictivo 1.58b', status: 'active' }
                            ]).map((pr, prIdx) => (
                              <span
                                key={prIdx}
                                className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{pr.name}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Linked Cerebros */}
                        <div className="space-y-1 pt-1 border-t border-white/5">
                          <span className="text-slate-400 font-bold flex items-center gap-1">
                            <Brain className="w-3 h-3 text-purple-400" />
                            Cerebros Vinculados:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {(persona.linked_cerebros || [
                              { name: currentBrain.name, color: currentBrain.color || '#00f0ff' }
                            ]).map((cb, cbIdx) => (
                              <span
                                key={cbIdx}
                                className="px-2 py-0.5 rounded-md border font-bold"
                                style={{ backgroundColor: `${cb.color || '#a855f7'}15`, borderColor: `${cb.color || '#a855f7'}40`, color: cb.color || '#a855f7' }}
                              >
                                {cb.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px]">{persona.voice_id || 'OmniVoice'}</span>
                        </div>
                        <button
                          onClick={() => omniVoice.speak(`Saludos. Soy ${persona.name}, operando en ${currentBrain.name}.`, { voice_id: persona.voice_id })}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <Play className="w-2.5 h-2.5" />
                          Probar Voz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: CAPAS MARKDOWN COGNITIVAS */}
            {activeTab === 'layers' && (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-hidden">
                <div className="bg-black/30 rounded-xl p-2 space-y-1 overflow-y-auto">
                  {biologicalLayers.map((layer) => {
                    const isLayerSelected = activeLayerKey === layer.key;
                    return (
                      <button
                        key={layer.key}
                        onClick={() => setActiveLayerKey(layer.key)}
                        className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                          isLayerSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="font-bold">{layer.name}</span>
                        <span className="text-[10px] opacity-70 truncate max-w-[110px]">{layer.region.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-2 bg-black/40 rounded-xl border border-white/5 p-3 flex flex-col space-y-2 overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{activeLayerKey}.md</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {biologicalLayers.find(l => l.key === activeLayerKey)?.region}
                      </span>
                    </div>
                    {isEditingLayer ? (
                      <button
                        onClick={handleSaveCurrentLayer}
                        disabled={isSaving}
                        className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSaving ? 'Guardando...' : 'Guardar Capa'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingLayer(true)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    )}
                  </div>

                  {isEditingLayer ? (
                    <textarea
                      value={layerContent}
                      onChange={(e) => setLayerContent(e.target.value)}
                      className="flex-1 w-full bg-transparent text-xs font-mono text-slate-200 leading-relaxed focus:outline-none resize-none p-1"
                    />
                  ) : (
                    <div className="flex-1 overflow-y-auto p-1 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {layerContent || 'Capa vacía. Pulsa editar para redactar contenido en Markdown.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: NEURONAS DE MEMORIA */}
            {activeTab === 'neurons' && (
              <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      Neuronas de Memoria para {currentBrain.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => setNewNeuronModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear Neurona
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentBrain.memory_neurons?.map((neuron) => (
                    <div
                      key={neuron.id}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: neuron.color || '#00f0ff' }} />
                            <h5 className="text-xs font-bold text-white">{neuron.name}</h5>
                          </div>
                          <span className="text-[10px] text-purple-300 font-mono block mt-0.5">
                            {neuron.lobe} • {neuron.sync_policy}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">{neuron.description}</p>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Modificación Universal (Todas las Personalidades)
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono">
                          Fuentes: {(neuron.storage_sources || ['local_fs', 'mem0_vault']).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: FUENTES DE ALMACENAMIENTO & GOOGLE DRIVE */}
            {activeTab === 'storage_sync' && (
              <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      Fuentes de Datos Sincronizadas & Google Drive (1.58b)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Múltiples almacenes locales y enlaces a Google Drive sincronizados en tiempo real como tokens de contexto.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoDetect}
                      className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
                      {detecting ? 'Detectando…' : '🔍 Detectar Almacenamientos'}
                    </button>
                    <button
                      onClick={handleSyncAllSources}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sincronizar Todo
                    </button>
                    <button
                      onClick={() => setNewGDriveModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      Google Drive
                    </button>
                    <button
                      onClick={() => setNewDestModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Almacén
                    </button>
                  </div>

                  {detectedBrains.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                      <h5 className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mb-2">
                        🔍 Cerebros Detectados en Almacenamientos Conectados
                      </h5>
                      <div className="space-y-2">
                        {detectedBrains.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/10">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">{d.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{d.source_label} · {d.source_type}</span>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await activateBrain(d.id);
                                  setToastMessage(`✅ Cerebro enlazado: ${d.name}`);
                                  const res = await fetchCerebros();
                                  setCerebrosData(res);
                                  setSelectedBrainId(d.id);
                                } catch (e) {
                                  setToastMessage('Error al enlazar cerebro detectado');
                                }
                                setTimeout(() => setToastMessage(''), 4000);
                              }}
                              className="px-3 py-1 rounded-lg bg-purple-500/30 hover:bg-purple-500/40 text-purple-200 text-[11px] font-bold shrink-0"
                            >
                              Enlazar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" />
                    Enlaces de Google Drive Vinculados
                  </h5>
                  {(currentBrain.google_drive_sources || []).map((g) => (
                    <div key={g.id} className="p-3 rounded-xl bg-black/40 border border-blue-500/30 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-white block">{g.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-md block">{g.url}</span>
                        <span className="text-[9px] text-emerald-400 font-mono mt-0.5 block">{g.sync_status}</span>
                      </div>
                      <button onClick={() => handleDeleteGoogleDrive(g.id)} className="text-slate-500 hover:text-rose-400 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Destinos de Bóveda & Almacenamiento
                  </h5>
                  {(currentBrain.storage_destinations || []).map((d) => (
                    <div key={d.id} className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{d.name}</span>
                          {d.is_primary && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                              Primario
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">{d.path || d.endpoint}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 7: FOLDERS DE CONTEXTO */}
            {activeTab === 'folders' && (
              <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-y-auto space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-blue-400" />
                      Carpetas de Contexto del Dispositivo
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Carpetas locales indexadas y consumidas como tokens de contexto por los agentes.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleNativeFolderPicker}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Elegir Carpeta
                    </button>
                    <button
                      onClick={() => setNewFolderModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Añadir Ruta
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(currentBrain.context_folders || []).map((f) => (
                    <div key={f.id} className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-white">{f.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{f.path}</span>
                        </div>
                        <button onClick={() => handleDeleteContextFolder(f.id)} className="text-slate-500 hover:text-rose-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {f.metrics && (
                        <div className="text-[10px] text-slate-400 font-mono flex gap-4">
                          <span>Archivos: {f.metrics.file_count || f.metrics.total_files || 0}</span>
                          <span>Capacidad: {f.metrics.size_mb || 0} MB</span>
                          <span className="text-emerald-400">{f.metrics.status || 'Activo'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 8: VOZ OMNIVOICE */}
            {activeTab === 'voice' && (
              <div className="flex-1 bg-black/30 rounded-xl p-4 overflow-y-auto space-y-4">
                <div className="pb-2 border-b border-white/10">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    Perfil Vocal OmniVoice para {currentBrain.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Configuración de síntesis de voz neuronal, tono y resonancia afectiva.
                  </p>
                </div>

                <div className="max-w-md space-y-3 font-mono">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <span className="text-xs font-bold text-white block">Voz Asignada:</span>
                    <span className="text-xs text-amber-300">{currentBrain.voice_profile?.voice_id || 'es-ES-ElviraNeural'}</span>
                    <p className="text-[11px] text-slate-400">{currentBrain.voice_profile?.caracter || 'Serena, lúcida y armónica'}</p>
                    <button
                      onClick={() => omniVoice.speak(`Prueba de audio para ${currentBrain.name}.`, currentBrain.voice_profile)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 mt-2"
                    >
                      <Play className="w-3 h-3" />
                      Reproducir Muestra
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-3 bg-[#0d1017]/95 border border-white/10 rounded-2xl p-8 flex items-center justify-center text-center">
            <p className="text-xs font-mono text-slate-400">Selecciona o crea un cerebro para comenzar.</p>
          </div>
        )}
      </div>

      {/* Modal: Adjuntar Memoria */}
      {attachMemModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0d121f] border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Orbit className="w-4 h-4 text-cyan-400" />
                Adjuntar Memoria a {targetAgentForMem?.name || currentBrain?.name}
              </h3>
              <button onClick={() => setAttachMemModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Concepto / Título del Recuerdo</label>
              <input
                type="text"
                placeholder="ej: Ontocracia Soberana & Aritmética Ternaria"
                value={newMemForm.concept}
                onChange={(e) => setNewMemForm({ ...newMemForm, concept: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Categoría</label>
              <input
                type="text"
                value={newMemForm.category}
                onChange={(e) => setNewMemForm({ ...newMemForm, category: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Contenido / Axioma</label>
              <textarea
                rows={3}
                placeholder="Descripción o axioma a registrar en StarSeed..."
                value={newMemForm.definition}
                onChange={(e) => setNewMemForm({ ...newMemForm, definition: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setAttachMemModal(false)} className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Cancelar
              </button>
              <button onClick={handleAttachMemorySubmit} className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold">
                Adjuntar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reorientar Directiva de Proceso */}
      {reorientModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0d121f] border border-purple-500/40 rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                Reorientar Proceso: {targetAgentForReorient?.name}
              </h3>
              <button onClick={() => setReorientModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nueva Tarea / Hipótesis Activa</label>
              <textarea
                rows={3}
                value={newProcessTask}
                onChange={(e) => setNewProcessTask(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-purple-400 focus:outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setReorientModal(false)} className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Cancelar
              </button>
              <button onClick={handleReorientSubmit} className="px-4 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold">
                Aplicar Nueva Directiva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vincular Google Drive */}
      {newGDriveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0d121f] border border-blue-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                Vincular Enlace / Carpeta de Google Drive
              </h3>
              <button onClick={() => setNewGDriveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Enlace de Google Drive (Carpeta o Archivo)</label>
              <input
                type="text"
                placeholder="https://drive.google.com/drive/folders/..."
                value={newGDriveForm.url}
                onChange={(e) => setNewGDriveForm({ ...newGDriveForm, url: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Etiqueta Identificadora</label>
              <input
                type="text"
                placeholder="ej: Carpeta Documentos StarSeed"
                value={newGDriveForm.label}
                onChange={(e) => setNewGDriveForm({ ...newGDriveForm, label: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Modo de Acceso & Permisos</label>
              <select
                value={newGDriveForm.access_permission}
                onChange={(e) => setNewGDriveForm({ ...newGDriveForm, access_permission: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-blue-400 focus:outline-none"
              >
                <option value="read_only_parameter">
                  🛡️ Solo Lectura (Uso como Parámetro y Contexto 1.58b)
                </option>
                <option value="read_write_sync">
                  🔄 Lectura y Modificación Sincronizada
                </option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setNewGDriveModal(false)} className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Cancelar
              </button>
              <button onClick={handleLinkGoogleDrive} className="px-4 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-bold">
                Vincular Fuente Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Instanciar Nuevo Cerebro */}
      {newBrainModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0d1017] border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-400" />
                Instanciar Nuevo Cerebro Multidimensional
              </h3>
              <button onClick={() => setNewBrainModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nombre del Cerebro</label>
              <input
                type="text"
                placeholder="ej: Cerebro de Seguridad & Criptografía"
                value={newBrainForm.name}
                onChange={(e) => setNewBrainForm({ ...newBrainForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Rol & Especialidad</label>
              <input
                type="text"
                placeholder="ej: Auditoría de contratos inteligentes y protocolos"
                value={newBrainForm.role}
                onChange={(e) => setNewBrainForm({ ...newBrainForm, role: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setNewBrainModal(false)} className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!newBrainForm.name.trim()) return;
                  const newBrain = {
                    id: `brain_${Date.now()}`,
                    name: newBrainForm.name,
                    role: newBrainForm.role || 'Cerebro Cognitivo Personalizado',
                    scope: 'personal',
                    color: newBrainForm.color,
                    active_persona: newBrainForm.active_persona,
                    voice_profile: { voice_id: 'es-ES-ElviraNeural', pitch: 1.0, rate: 1.05, style: 'Sereno' },
                    storage_backend: { type: 'local_fs', path: `/Users/alex/Documents/IA 1.58 bit/data/cerebros/${newBrainForm.name.toLowerCase().replace(/\s+/g, '_')}` },
                    security_permissions: { access_level: 'admin', allow_terminal_exec: true, allow_fs_write: true, allow_fs_read_all: true, allow_browser_crawl: true, air_gap_mode: false },
                    memory_neurons: [],
                    storage_destinations: [],
                    context_folders: [],
                    md_layers: { soul: `# Soul // ${newBrainForm.name}`, ego: `# Ego`, personality: `# Personality`, style: `# Style`, skills: `# Skills`, memory: `# Memory`, dream: `# Dream`, accounts: `# Accounts`, tasks: `# Tasks`, logs: `# Logs` }
                  };
                  await saveBrain(newBrain);
                  setNewBrainModal(false);
                  setNewBrainForm({ name: '', role: '', color: '#00f0ff', active_persona: 'astraura_prime' });
                  await loadData();
                  setSelectedBrainId(newBrain.id);
                  showToast(`Nuevo cerebro '${newBrain.name}' creado`);
                }}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-black text-xs font-bold"
              >
                Crear e Inicializar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Añadir Ruta de Carpeta */}
      {newFolderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0d121f] border border-blue-500/40 rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-blue-400" />
                Indexar Carpeta de Contexto
              </h3>
              <button onClick={() => setNewFolderModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Ruta Absoluta de la Carpeta</label>
              <input
                type="text"
                placeholder="/Users/alex/Documents/mi_proyecto"
                value={newFolderForm.path}
                onChange={(e) => setNewFolderForm({ ...newFolderForm, path: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Etiqueta</label>
              <input
                type="text"
                placeholder="ej: Workspace Principal"
                value={newFolderForm.label}
                onChange={(e) => setNewFolderForm({ ...newFolderForm, label: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setNewFolderModal(false)} className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Cancelar
              </button>
              <button onClick={handleAddContextFolder} className="px-4 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-bold">
                Indexar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Neurona de Memoria */}
      {newNeuronModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-[#0d121f] border border-purple-500/40 rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                Instanciar Nueva Neurona de Memoria
              </h3>
              <button onClick={() => setNewNeuronModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nombre de la Neurona</label>
              <input
                type="text"
                placeholder="ej: Neurona de Axiomas Epistemológicos"
                value={newNeuronForm.name}
                onChange={(e) => setNewNeuronForm({ ...newNeuronForm, name: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Lóbulo Cerebral Asociado</label>
              <select
                value={newNeuronForm.lobe}
                onChange={(e) => setNewNeuronForm({ ...newNeuronForm, lobe: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:border-purple-400 focus:outline-none"
              >
                <option value="Hipocampo">Hipocampo (Memorias & Contexto)</option>
                <option value="Córtex Prefrontal">Córtex Prefrontal (Valores & Ontocracia)</option>
                <option value="DMN">Red Neuronal por Defecto (Imaginación)</option>
                <option value="Cerebelo">Cerebelo (Procedimientos & Shell)</option>
                <option value="Sistema Límbico">Sistema Límbico (Emociones & Tono)</option>
                <option value="Tálamo">Tálamo (Sensorium & Hardware)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button onClick={() => setNewNeuronModal(false)} className="px-3.5 py-1.5 rounded-xl bg-white/5 text-slate-300 text-xs">
                Cancelar
              </button>
              <button onClick={handleAddNeuron} className="px-4 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold">
                Crear Neurona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
