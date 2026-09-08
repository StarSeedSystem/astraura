import os
import time
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Corrección de la ruta de importación
import sys
from pathlib import Path as _Path
sys.path.append(str(_Path(__file__).parent.parent.parent))

from backend.app.agents.swarm_manager import AdaptiveMultiAreaSwarmEngine


@pytest.mark.asyncio
async def test_swarm_fondo_features(tmp_path):
    """Test para las características de fondo del enjambre"""
    # Instanciar el motor con directorio temporal
    motor = AdaptiveMultiAreaSwarmEngine(data_dir=tmp_path)
    
    # Testear _servidor_compartido
    with patch('app.engine.bitnet_cpp_manager') as mock_bm:
        mock_bm._servidor_compartido.return_value = True
        assert motor._servidor_compartido() is True
        
        # Si falla, debe usar psutil
        mock_bm._servidor_compartido.side_effect = Exception("Error")
        with patch('psutil.virtual_memory') as mock_vm:
            mock_vm.return_value.total = 8 * 1024**3  # 8 GB
            assert motor._servidor_compartido() is True
    
    # Testear _fondo_proactivo_permitido
    # Caso 1: Servidor compartido sin variable de entorno -> False
    with patch.object(motor, '_servidor_compartido', return_value=True):
        if 'ASTRAURA_FONDO_PROACTIVO' in os.environ:
            del os.environ['ASTRAURA_FONDO_PROACTIVO']
        assert motor._fondo_proactivo_permitido() is False
    
    # Caso 2: Variable de entorno en 1/true/si -> True
    os.environ['ASTRAURA_FONDO_PROACTIVO'] = '1'
    assert motor._fondo_proactivo_permitido() is True
    
    os.environ['ASTRAURA_FONDO_PROACTIVO'] = 'true'
    assert motor._fondo_proactivo_permitido() is True
    
    os.environ['ASTRAURA_FONDO_PROACTIVO'] = 'si'
    assert motor._fondo_proactivo_permitido() is True
    
    # Caso 3: Variable de entorno en 0/false/no -> False
    os.environ['ASTRAURA_FONDO_PROACTIVO'] = '0'
    assert motor._fondo_proactivo_permitido() is False
    
    os.environ['ASTRAURA_FONDO_PROACTIVO'] = 'false'
    assert motor._fondo_proactivo_permitido() is False
    
    os.environ['ASTRAURA_FONDO_PROACTIVO'] = 'no'
    assert motor._fondo_proactivo_permitido() is False
    
    # Caso 4: No compartido -> True
    with patch.object(motor, '_servidor_compartido', return_value=False):
        if 'ASTRAURA_FONDO_PROACTIVO' in os.environ:
            del os.environ['ASTRAURA_FONDO_PROACTIVO']
        assert motor._fondo_proactivo_permitido() is True
    
    # Limpiar variable de entorno
    if 'ASTRAURA_FONDO_PROACTIVO' in os.environ:
        del os.environ['ASTRAURA_FONDO_PROACTIVO']


@pytest.mark.asyncio
async def test_chat_tiene_turno(tmp_path):
    """Test para la detección de si el chat tiene el turno"""
    motor = AdaptiveMultiAreaSwarmEngine(data_dir=tmp_path)
    
    now = time.time()
    
    # Configurar actividad reciente del usuario (dentro del umbral por defecto de 300s)
    motor.last_user_activity_time = now
    assert motor._chat_tiene_el_turno(now) is True
    
    # Configurar actividad antigua del usuario (fuera del umbral)
    motor.last_user_activity_time = now - 1000
    assert motor._chat_tiene_el_turno(now) is False
    
    # Testear con bitnet_cpp_manager._ultimo_uso_interactivo
    with patch('app.engine.bitnet_cpp_manager') as mock_bm:
        # Si _ultimo_uso_interactivo está dentro del umbral
        mock_bm._ultimo_uso_interactivo = now - 100  # Dentro del umbral de 300s
        assert motor._chat_tiene_el_turno(now) is True
        
        # Si _ultimo_uso_interactivo está fuera del umbral
        mock_bm._ultimo_uso_interactivo = now - 1000  # Fuera del umbral de 300s
        assert motor._chat_tiene_el_turno(now) is False
        
        # Si _ultimo_uso_interactivo es None
        mock_bm._ultimo_uso_interactivo = None
        assert motor._chat_tiene_el_turno(now) is False


@pytest.mark.asyncio
async def test_cognize_deliverable_max_tokens(tmp_path):
    """Test para comprobar que _cognize_deliverable respeta las configuraciones de tokens"""
    motor = AdaptiveMultiAreaSwarmEngine(data_dir=tmp_path)
    
    # Mockear las funciones de app.core.cognition
    async def mock_generate(*args, **kwargs):
        return {"real": True, "text": "x" * 80}
    
    with patch('app.core.cognition.real_available', return_value=True), \
         patch('app.core.cognition.generate', side_effect=mock_generate) as mock_gen:
        # Crear una tarea de ejemplo
        tarea = {
            "area_id": "area_engineering",
            "agent_id": "hephaestus",
            "title": "Test",
            "prompt": "Test",
            "target_folder_path": str(tmp_path)
        }
        
        # Con variable de entorno específica
        os.environ['ASTRAURA_FONDO_TOKENS'] = '99'
        await motor._cognize_deliverable(tarea)
        # Verificar que se llamó con max_tokens=99
        called_with_correct_tokens = False
        for call_args in mock_gen.call_args_list:
            if call_args.kwargs.get('max_tokens') == 99:
                called_with_correct_tokens = True
                break
        assert called_with_correct_tokens, f"La función generate no fue llamada con max_tokens=99. Se llamó con: {[call.kwargs.get('max_tokens') for call in mock_gen.call_args_list]}"
        
        # Limpiar
        del os.environ['ASTRAURA_FONDO_TOKENS']
        
        # En servidor compartido, debería usar 160 tokens (después de restablecer el entorno)
        os.environ['ASTRAURA_FONDO_TOKENS'] = '160'  # Aseguramos el valor para esta prueba
        with patch.object(motor, '_servidor_compartido', return_value=True):
            await motor._cognize_deliverable(tarea)
            called_with_correct_tokens = False
            for call_args in mock_gen.call_args_list:
                max_tokens = call_args.kwargs.get('max_tokens')
                if max_tokens == 160:
                    called_with_correct_tokens = True
                    break
            assert called_with_correct_tokens, f"La función generate no fue llamada con max_tokens=160 en servidor compartido. Se llamó con: {[call.kwargs.get('max_tokens') for call in mock_gen.call_args_list]}"
        
        # Limpiar
        if 'ASTRAURA_FONDO_TOKENS' in os.environ:
            del os.environ['ASTRAURA_FONDO_TOKENS']


@pytest.mark.asyncio
async def test_barrido_funcionalidad(tmp_path):
    """Test para verificar que la funcionalidad de barrido funciona correctamente"""
    motor = AdaptiveMultiAreaSwarmEngine(data_dir=tmp_path)
    
    # Despachar una tarea para que esté disponible
    resultado = motor.dispatch_task(
        area_id="area_engineering",
        title="Test Task",
        prompt="Test Prompt"
    )
    
    # Verificar que la tarea existe en la cola
    assert len(motor.active_tasks) == 1
    tarea = motor.active_tasks[0]
    assert tarea["title"] == "Test Task"
    
    # Simular que la tarea está en la fase de generación
    tarea["real_stage"] = "generate"
    
    # Simular que el chat tiene el turno
    now = time.time()
    motor.last_user_activity_time = now  # Actividad reciente
    
    # Llamar a la función de barrido (que ahora simula el bucle principal)
    motor._barrido(now)
    
    # Verificar que la tarea está esperando el turno del motor
    assert tarea["phase_label"] == "Esperando: el chat tiene el turno del motor 1.58"
    assert "_gen_launched" not in tarea  # No se debería haber iniciado la generación
    assert tarea.get("started_at") is not None  # Se debe haber actualizado started_at para evitar que se elimine como atascada
