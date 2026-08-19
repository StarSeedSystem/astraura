import numpy as np
import struct
from typing import Tuple, Dict, Any, List

class TernaryQuantizer:
    """
    Implements 1.58-bit Ternary Quantization as defined in Microsoft's BitNet b1.58 paper:
    Weights are constrained to the ternary set {-1, 0, +1}, enabling matrix multiplications 
    to be computed via pure addition and subtraction without floating-point multipliers.
    """
    
    @staticmethod
    def quantize_weights(W: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Quantizes full-precision weights to {-1, 0, +1} using the absmean scaling factor gamma.
        W_quant = Clip(Round(W / gamma), -1, 1)
        """
        gamma = float(np.mean(np.abs(W))) + 1e-8
        scaled_w = W / gamma
        quantized = np.clip(np.round(scaled_w), -1, 1).astype(np.int8)
        return quantized, gamma

    @staticmethod
    def pack_ternary_weights(weights: np.ndarray) -> bytes:
        """
        Packs ternary weights {-1, 0, 1} into 2-bit format (int2 / i2_s).
        4 weights are packed into a single 8-bit uint8 byte:
        Encoding: 0 -> 0b00, +1 -> 0b01, -1 -> 0b10
        """
        flat = weights.flatten()
        # Pad to multiple of 4
        pad_len = (4 - (len(flat) % 4)) % 4
        if pad_len > 0:
            flat = np.pad(flat, (0, pad_len), 'constant', constant_values=0)
            
        # Map values: 0 -> 0, 1 -> 1, -1 -> 2
        mapped = np.zeros_like(flat, dtype=np.uint8)
        mapped[flat == 1] = 0b01
        mapped[flat == -1] = 0b10
        
        # Reshape to groups of 4 and pack into 1 byte
        grouped = mapped.reshape(-1, 4)
        packed = (grouped[:, 0] << 6) | (grouped[:, 1] << 4) | (grouped[:, 2] << 2) | grouped[:, 3]
        return packed.tobytes()

    @staticmethod
    def unpack_ternary_weights(packed_bytes: bytes, original_shape: Tuple[int, ...]) -> np.ndarray:
        """
        Unpacks int2 packed bytes back into {-1, 0, 1} ternary array.
        """
        packed = np.frombuffer(packed_bytes, dtype=np.uint8)
        w0 = (packed >> 6) & 0b11
        w1 = (packed >> 4) & 0b11
        w2 = (packed >> 2) & 0b11
        w3 = packed & 0b11
        
        unpacked_mapped = np.stack([w0, w1, w2, w3], axis=1).flatten()
        
        result = np.zeros_like(unpacked_mapped, dtype=np.int8)
        result[unpacked_mapped == 0b01] = 1
        result[unpacked_mapped == 0b10] = -1
        
        total_elements = int(np.prod(original_shape))
        return result[:total_elements].reshape(original_shape)

    @staticmethod
    def compute_stats(weights_ternary: np.ndarray) -> Dict[str, Any]:
        """
        Calculates sparsity and distribution of ternary states {-1, 0, +1}.
        """
        total = weights_ternary.size
        count_neg1 = int(np.sum(weights_ternary == -1))
        count_zero = int(np.sum(weights_ternary == 0))
        count_pos1 = int(np.sum(weights_ternary == 1))
        
        sparsity = round((count_zero / total) * 100, 2)
        entropy = round(np.log2(3), 3) # ~1.585 bits
        
        return {
            "total_parameters": total,
            "neg1_count": count_neg1,
            "neg1_pct": round((count_neg1 / total) * 100, 1),
            "zero_count": count_zero,
            "zero_pct": round((count_zero / total) * 100, 1),
            "pos1_count": count_pos1,
            "pos1_pct": round((count_pos1 / total) * 100, 1),
            "sparsity_pct": sparsity,
            "theoretical_entropy_bits": entropy,
            "compression_ratio_vs_fp16": "8.0x"
        }

class TernaryLinearLayer:
    """
    High-efficiency 1.58-bit Linear Layer implementing matrix operations via ternary additions.
    """
    def __init__(self, in_features: int, out_features: int):
        self.in_features = in_features
        self.out_features = out_features
        
        # Initialize random weights and quantize to {-1, 0, 1}
        raw_w = np.random.randn(out_features, in_features).astype(np.float32)
        self.weights_ternary, self.gamma = TernaryQuantizer.quantize_weights(raw_w)
        self.packed_weights = TernaryQuantizer.pack_ternary_weights(self.weights_ternary)
        self.bias = np.zeros(out_features, dtype=np.float32)

    def forward(self, x: np.ndarray) -> np.ndarray:
        """
        Forward pass: (x @ W.T) * gamma + bias
        Where W is in {-1, 0, 1}.
        """
        # Unpack / use ternary matrix
        out = np.matmul(x, self.weights_ternary.T).astype(np.float32) * self.gamma
        return out + self.bias
