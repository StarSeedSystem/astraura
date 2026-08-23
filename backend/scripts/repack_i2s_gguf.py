#!/usr/bin/env python3
"""
Re-empaqueta un GGUF I2_S de BitNet desde un layout antiguo al layout que usan
los kernels actuales de `backend/BitNet` (bloques de 128 valores → 32 bytes,
byte k = e[k]<<6 | e[k+32]<<4 | e[k+64]<<2 | e[k+96]; escala f32 al final).

Uso:
  python3 scripts/repack_i2s_gguf.py <in.gguf> <out.gguf> --from {x86rows,arm64,strided32}

Layouts de ORIGEN soportados:
  x86rows   · bitnet.cpp x86 antiguo: 1 byte = la misma columna de 4 filas
              consecutivas (bits 6,4,2,0 = filas r0..r3).
  arm64     · bitnet.cpp ARM antiguo (QK=64): bloque de 64 → 16 bytes,
              byte k = e[k]<<6 | e[k+16]<<4 | e[k+32]<<2 | e[k+48].
  strided32 · ya es el layout actual (solo copia / normaliza file_type).

Honesto: no inventa pesos; solo reordena bits. Verifica después con
`llama-perplexity` (una PPL que cae de ~40 a <15 en texto llano confirma el layout).
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


def decode_x86rows(raw: np.ndarray, nrow: int, ncol: int) -> np.ndarray:
    packed = raw[: (nrow // 4) * ncol].reshape(nrow // 4, ncol)
    q = np.empty((nrow, ncol), dtype=np.uint8)
    q[0::4] = (packed >> 6) & 3
    q[1::4] = (packed >> 4) & 3
    q[2::4] = (packed >> 2) & 3
    q[3::4] = packed & 3
    return q


def decode_arm64(raw: np.ndarray, nrow: int, ncol: int) -> np.ndarray:
    nb = ncol // 64
    packed = raw[: nrow * ncol // 4].reshape(nrow, nb, 16)
    q = np.empty((nrow, nb, 4, 16), dtype=np.uint8)
    q[:, :, 0, :] = (packed >> 6) & 3
    q[:, :, 1, :] = (packed >> 4) & 3
    q[:, :, 2, :] = (packed >> 2) & 3
    q[:, :, 3, :] = packed & 3
    return q.reshape(nrow, ncol)


def decode_strided32(raw: np.ndarray, nrow: int, ncol: int) -> np.ndarray:
    nb = ncol // 128
    packed = raw[: nrow * ncol // 4].reshape(nrow, nb, 32)
    q = np.empty((nrow, nb, 4, 32), dtype=np.uint8)
    q[:, :, 0, :] = (packed >> 6) & 3
    q[:, :, 1, :] = (packed >> 4) & 3
    q[:, :, 2, :] = (packed >> 2) & 3
    q[:, :, 3, :] = packed & 3
    return q.reshape(nrow, ncol)


def encode_strided32(q: np.ndarray) -> np.ndarray:
    nrow, ncol = q.shape
    nb = ncol // 128
    blocks = q.reshape(nrow, nb, 4, 32)
    packed = (blocks[:, :, 0, :] << 6) | (blocks[:, :, 1, :] << 4) | (blocks[:, :, 2, :] << 2) | blocks[:, :, 3, :]
    return packed.astype(np.uint8).reshape(-1)


DECODERS = {"x86rows": decode_x86rows, "arm64": decode_arm64, "strided32": decode_strided32}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--from", dest="layout", choices=sorted(DECODERS), required=True)
    args = ap.parse_args()

    reader = gguf.GGUFReader(args.src)
    arch = reader.fields["general.architecture"].contents()
    writer = gguf.GGUFWriter(args.dst, arch)
    copied = 0
    for field in reader.fields.values():
        if field.name == "general.architecture" or field.name.startswith("GGUF."):
            continue
        val = field.contents()
        if field.name == "general.file_type":
            val = 41  # MOSTLY_I2_S en el fork actual
        vtype = field.types[0]
        sub = field.types[-1] if vtype == GGUFValueType.ARRAY else None
        writer.add_key_value(field.name, val, vtype, sub_type=sub)
        copied += 1
    print(f"[repack] metadata copiada: {copied} campos · file_type → 41")

    decode = DECODERS[args.layout]
    with open(args.src, "rb") as fh:
        for t in reader.tensors:
            shape = [int(x) for x in t.shape]
            if t.tensor_type == GGMLQuantizationType.I2_S:
                ncol, nrow = shape[0], shape[1]
                n = nrow * ncol
                nbytes = n // 4 + 32
                fh.seek(int(t.data_offset))  # offset absoluto en el archivo
                raw = np.frombuffer(fh.read(nbytes), dtype=np.uint8)
                scale_tail = raw[n // 4:].copy()
                q = decode(raw, nrow, ncol)
                out = np.concatenate([encode_strided32(q), scale_tail])
                assert out.nbytes == nbytes
                writer.add_tensor(t.name, out, raw_shape=list(reversed(shape)), raw_dtype=GGMLQuantizationType.I2_S)
            else:
                arr = np.asarray(t.data)
                writer.add_tensor(t.name, arr, raw_shape=list(reversed(shape)), raw_dtype=t.tensor_type)
    writer.write_header_to_file()
    writer.write_kv_data_to_file()
    writer.write_tensors_to_file(progress=True)
    writer.close()
    print(f"[repack] escrito {args.dst}")


if __name__ == "__main__":
    main()
