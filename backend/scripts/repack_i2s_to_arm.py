#!/usr/bin/env python3
"""
(Adenda 162) Re-empaqueta un GGUF I2_S al layout que leen los kernels ARM NEON.

POR QUE HACE FALTA
------------------
El tamano de bloque de i2_s NO es el mismo en x86 y en ARM. En todo el arbol de
bitnet.cpp (`quants.c`, `ggml-cpu-i2s.c`, `ggml-bitnet-mad.cpp`):

    #if defined(__AVX2__) || defined(__AVX512F__)
    #define QK_I2_S 128
    #elif defined(__ARM_NEON)
    #define QK_I2_S 64          <-- ARM usa 64
    #else
    #define QK_I2_S 128

El kernel NEON de `ggml_vec_dot_i2_i8_s` carga **16 bytes de pesos por cada 64
activaciones** (`px += 16` frente a `y + j*64`), y empareja los pares de bits
6/4/2/0 de cada byte k con y[k], y[k+16], y[k+32] e y[k+48]. Es decir: bloques
de 64 valores en 16 bytes, con paso de 16.

Pero `dequantize_row_i2_s` —y con el los GGUF oficiales de Microsoft— empaqueta
bloques de **128 valores en 32 bytes, con paso de 32** (byte k lleva k, k+32,
k+64 y k+96). Ese es el layout que aqui llamamos `strided32`.

Los dos layouts son permutaciones distintas de los MISMOS bits, asi que el
histograma global de pesos es identico y ninguna comprobacion estadistica los
distingue: el modelo carga sin quejarse y devuelve un token constante.

`scripts/repack_i2s_gguf.py` sabe DECODIFICAR el layout arm64, pero solo sabe
CODIFICAR hacia strided32 — el codificador ARM no existia. Es la pieza que
faltaba, y es la que implementa este script.

No inventa ni un peso: solo reordena bits y conserva intacta la cola de 32 bytes
con la escala f32 de cada fila.

Uso:
  python3 scripts/repack_i2s_to_arm.py <in.gguf> <out.gguf>
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "BitNet" / "3rdparty" / "llama.cpp" / "gguf-py"))
import gguf  # noqa: E402
from gguf import GGMLQuantizationType, GGUFValueType  # noqa: E402


def decode_strided32(raw: np.ndarray, nrow: int, ncol: int) -> np.ndarray:
    """Layout de los GGUF oficiales: 128 valores en 32 bytes, paso 32."""
    nb = ncol // 128
    packed = raw[: nrow * ncol // 4].reshape(nrow, nb, 32)
    q = np.empty((nrow, nb, 4, 32), dtype=np.uint8)
    q[:, :, 0, :] = (packed >> 6) & 3
    q[:, :, 1, :] = (packed >> 4) & 3
    q[:, :, 2, :] = (packed >> 2) & 3
    q[:, :, 3, :] = packed & 3
    return q.reshape(nrow, ncol)


def encode_arm64(q: np.ndarray) -> np.ndarray:
    """LA PIEZA QUE FALTABA: 64 valores en 16 bytes, paso 16 (QK_I2_S=64)."""
    nrow, ncol = q.shape
    if ncol % 64:
        raise SystemExit(f"ncol={ncol} no es multiplo de 64: no cabe en bloques ARM")
    nb = ncol // 64
    blocks = q.reshape(nrow, nb, 4, 16)
    packed = (blocks[:, :, 0, :] << 6) | (blocks[:, :, 1, :] << 4) | (blocks[:, :, 2, :] << 2) | blocks[:, :, 3, :]
    return packed.astype(np.uint8).reshape(-1)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    args = ap.parse_args()

    reader = gguf.GGUFReader(args.src)
    arch = reader.fields["general.architecture"].contents()
    writer = gguf.GGUFWriter(args.dst, arch)

    copied = 0
    for field in reader.fields.values():
        if field.name == "general.architecture" or field.name.startswith("GGUF."):
            continue
        val = field.contents()
        vtype = field.types[0]
        sub = field.types[-1] if vtype == GGUFValueType.ARRAY else None
        writer.add_key_value(field.name, val, vtype, sub_type=sub)
        copied += 1
    print(f"[repack-arm] metadata copiada: {copied} campos (file_type intacto)")

    n_i2s = 0
    with open(args.src, "rb") as fh:
        for t in reader.tensors:
            shape = [int(x) for x in t.shape]
            if t.tensor_type == GGMLQuantizationType.I2_S:
                ncol, nrow = shape[0], shape[1]
                n = nrow * ncol
                nbytes = n // 4 + 32
                fh.seek(int(t.data_offset))
                raw = np.frombuffer(fh.read(nbytes), dtype=np.uint8)
                scale_tail = raw[n // 4:].copy()          # escala f32 por fila: intacta
                q = decode_strided32(raw, nrow, ncol)
                out = np.concatenate([encode_arm64(q), scale_tail])
                assert out.nbytes == nbytes, f"{t.name}: {out.nbytes} != {nbytes}"
                writer.add_tensor(t.name, out, raw_shape=list(reversed(shape)),
                                  raw_dtype=GGMLQuantizationType.I2_S)
                n_i2s += 1
            else:
                writer.add_tensor(t.name, np.asarray(t.data), raw_shape=list(reversed(shape)),
                                  raw_dtype=t.tensor_type)

    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file(progress=True)
    writer.close()
    print(f"[repack-arm] {n_i2s} tensores I2_S reordenados a bloques de 64 (paso 16)")
    print(f"[repack-arm] escrito {args.dst}")


if __name__ == "__main__":
    main()
