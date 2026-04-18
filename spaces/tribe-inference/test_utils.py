"""Unit tests for Space utility helpers (no GPU required)."""
import base64
import struct
import sys
from pathlib import Path
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).parent))
from utils import encode_predictions


class TestEncodePredictions:
    def test_output_is_valid_base64(self):
        arr = np.random.default_rng(0).standard_normal((10, 20484)).astype(np.float32)
        encoded = encode_predictions(arr)
        decoded = base64.b64decode(encoded)
        assert len(decoded) == 10 * 20484 * 2  # float16 = 2 bytes

    def test_roundtrip_fidelity(self):
        arr = np.array([[1.5, -0.5, 0.0, 2.0]], dtype=np.float32)
        encoded = encode_predictions(arr)
        raw = base64.b64decode(encoded)
        recovered = np.frombuffer(raw, dtype=np.float16).astype(np.float32)
        # float16 has ~3 decimal digits of precision
        np.testing.assert_allclose(recovered, arr.flatten(), rtol=1e-2)

    def test_shape_preserved(self):
        arr = np.zeros((30, 20484), dtype=np.float32)
        encoded = encode_predictions(arr)
        raw = base64.b64decode(encoded)
        recovered = np.frombuffer(raw, dtype=np.float16).reshape(30, 20484)
        assert recovered.shape == (30, 20484)
