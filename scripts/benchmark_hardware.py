import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.core.profiler import profiler

def main():
    print("=" * 65)
    print("🔬 ASTRAURA 1.58-BIT HARDWARE BENCHMARK & AUTO-TUNING SUITE")
    print("=" * 65)
    
    profile = profiler.auto_tune()
    
    sys_info = profile["system"]
    bench = profile["benchmark"]
    tuning = profile["auto_tuning"]
    
    print("\n[1] ESPECIFICACIONES DE HARDWARE:")
    print(f"  • Sistema Operativo:   {sys_info['os']} ({sys_info['arch']})")
    print(f"  • Procesador:          {sys_info['processor']}")
    print(f"  • Núcleos Físicos:     {sys_info['physical_cores']} Cores (Lógicos: {sys_info['logical_cores']})")
    print(f"  • Memoria RAM:         {sys_info['total_ram_gb']} GB (Disponible: {sys_info['available_ram_gb']} GB)")
    print(f"  • Aceleración SIMD:    {', '.join(sys_info['simd_features'])}")
    
    print("\n[2] RENDIMIENTO & COMPRESIÓN DE 1.58 BITS:")
    print(f"  • Matriz de prueba:    {bench['matrix_dimension']}")
    print(f"  • Compresión vs FP16:  {bench['memory_compression_vs_fp16']} (1/8 del tamaño original)")
    print(f"  • Compresión vs FP32:  {bench['memory_compression_vs_fp32']} (1/16 del tamaño original)")
    print(f"  • Clasificación:       {bench['efficiency_rating']}")
    
    print("\n[3] PARÁMETROS AUTO-CONFIGURADOS:")
    print(f"  • Hilos Óptimos:       {tuning['optimal_threads']} hilos de cómputo")
    print(f"  • Ventana de Contexto: {tuning['optimal_context_size']} tokens")
    print(f"  • Tamaño de Batch:     {tuning['optimal_batch_size']}")
    print(f"  • Formato Cuantizado:  {tuning['quantization_format']}")
    print(f"  • Gestión de Memoria:  {tuning['cache_strategy']}")
    print("=" * 65)

if __name__ == "__main__":
    main()
