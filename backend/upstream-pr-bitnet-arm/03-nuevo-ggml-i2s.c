// (Adenda 160) Implementaciones i2_s que ggml-base NECESITA.
// Se declaran en ggml-quants.h (ggml-base) y las usa la tabla type_traits de
// ggml.c, pero vivian en ggml-cpu/quants.c — otra libreria, y el enlace solo
// va de ggml-cpu hacia ggml-base. Aqui esta el MISMO codigo, sin un solo
// cambio de logica, compilado en la libreria correcta.

#include "ggml-quants.h"

#include <math.h>
#include <string.h>
#include <stdint.h>

#ifndef MIN
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#endif

void dequantize_row_i2_s(const uint8_t * x, float * y, int64_t n, const float i2_scale) {
    static const float map2bit[4] = { -1.0f, 0.0f, 1.0f, 0.0f };
    int64_t done = 0;
    while (done < n) {
        int64_t cols0 = MIN(32, n - done - 0*32);
        int64_t cols1 = MIN(32, n - done - 1*32);
        int64_t cols2 = MIN(32, n - done - 2*32);
        int64_t cols3 = MIN(32, n - done - 3*32);
        for (int gp = 0; gp < 32; gp++) {
            uint8_t byte = x[(done/4) + gp];
            uint8_t c0 = (byte >> 6) & 0x03;
            uint8_t c1 = (byte >> 4) & 0x03;
            uint8_t c2 = (byte >> 2) & 0x03;
            uint8_t c3 = (byte >> 0) & 0x03;
            if (gp < cols0) y[done + 0*32 + gp] = i2_scale * map2bit[c0];
            if (gp < cols1) y[done + 1*32 + gp] = i2_scale * map2bit[c1];
            if (gp < cols2) y[done + 2*32 + gp] = i2_scale * map2bit[c2];
            if (gp < cols3) y[done + 3*32 + gp] = i2_scale * map2bit[c3];
        }
        done += 128;
    }
}

size_t quantize_i2_s(const float * src, void * dst, int64_t nrow, int64_t n_per_row, const float * quant_weights) {
    (void)quant_weights;
    int64_t n = nrow * n_per_row;

    double max = 0.0;
    for (int64_t i = 0; i < n; i++) {
        double v = fabs((double)src[i]);
        if (v > max) { max = v; break; }  // first nonzero abs as scale (BitNet convention)
    }

    uint8_t * q = (uint8_t *)dst;
    memset(q, 0, n / 4);

    for (int64_t i = 0; i < n; i++) {
        uint8_t val;
        if (fabs((double)src[i]) < 1e-6) {
            val = 1; // maps to 0
        } else {
            val = ((double)src[i] * max > 0) ? 2 : 0; // maps to +1 or -1
        }
        int byte_idx = i / 4;
        int bit_pos = 6 - 2 * (i % 4);
        q[byte_idx] |= (val << bit_pos);
    }

    float * scale_ptr = (float *)(q + n / 4);
    scale_ptr[0] = (float)max;

    return nrow * n_per_row / 4 + 32;
}
