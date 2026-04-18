"""Unit tests for chunk stitching and binary format."""
import struct
import tempfile
from pathlib import Path

import numpy as np
import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from braingui_api.services.stitch import stitch_chunks_to_bin, _crossfade_stitch
from braingui_api.services.ingest import compute_chunks


N_VERTICES = 20484


def _make_chunk(chunk_index: int, n_frames: int, start_sec: float, end_sec: float) -> dict:
    rng = np.random.default_rng(chunk_index)
    return {
        "chunk_index": chunk_index,
        "start_sec": start_sec,
        "end_sec": end_sec,
        "vertex_data": rng.standard_normal((n_frames, N_VERTICES)).tolist(),
    }


class TestStitchToBin:
    def test_single_chunk_writes_correct_header(self):
        chunk = _make_chunk(0, 60, 0.0, 60.0)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.bin"
            total = stitch_chunks_to_bin([chunk], out)
            assert total == 60
            with open(out, "rb") as f:
                t_frames, n_verts = struct.unpack("<II", f.read(8))
            assert t_frames == 60
            assert n_verts == N_VERTICES

    def test_single_chunk_data_is_float16(self):
        chunk = _make_chunk(0, 30, 0.0, 30.0)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.bin"
            stitch_chunks_to_bin([chunk], out)
            size = out.stat().st_size
            # 8 bytes header + 30 * 20484 * 2 bytes data
            assert size == 8 + 30 * N_VERTICES * 2

    def test_single_chunk_data_is_zscored(self):
        chunk = _make_chunk(0, 100, 0.0, 100.0)
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.bin"
            stitch_chunks_to_bin([chunk], out)
            with open(out, "rb") as f:
                f.read(8)
                raw = f.read()
            arr = np.frombuffer(raw, dtype=np.float16).astype(np.float32).reshape(100, N_VERTICES)
            # After z-scoring: mean ≈ 0, std ≈ 1 across time
            col_means = arr.mean(axis=0)
            assert np.abs(col_means).mean() < 0.1

    def test_two_chunks_no_crash(self):
        chunks = [
            _make_chunk(0, 90, 0.0, 90.0),
            _make_chunk(1, 90, 80.0, 170.0),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.bin"
            total = stitch_chunks_to_bin(chunks, out)
            # With 10s overlap: 90 + 90 - 10 = 170 frames
            assert total == 170

    def test_multiple_chunks_sorted_by_index(self):
        chunks = [
            _make_chunk(1, 90, 80.0, 170.0),
            _make_chunk(0, 90, 0.0, 90.0),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out.bin"
            total = stitch_chunks_to_bin(chunks, out)
            assert total == 170

    def test_empty_chunks_raises(self):
        with pytest.raises(ValueError, match="No chunk results"):
            with tempfile.TemporaryDirectory() as tmp:
                stitch_chunks_to_bin([], Path(tmp) / "out.bin")

    def test_wrong_vertex_count_raises(self):
        bad_chunk = {
            "chunk_index": 0,
            "start_sec": 0.0,
            "end_sec": 30.0,
            "vertex_data": np.zeros((30, 1000)).tolist(),
        }
        with pytest.raises(ValueError, match="Unexpected vertex data shape"):
            with tempfile.TemporaryDirectory() as tmp:
                stitch_chunks_to_bin([bad_chunk], Path(tmp) / "out.bin")


class TestCrossfadeStitch:
    def test_blend_output_shape(self):
        a = np.ones((90, N_VERTICES), dtype=np.float32)
        b = np.ones((90, N_VERTICES), dtype=np.float32) * 2
        result = _crossfade_stitch([a, b], [0.0, 80.0], [90.0, 170.0], overlap_sec=10)
        assert result.shape == (170, N_VERTICES)

    def test_blend_values_between_inputs(self):
        a = np.ones((20, 10), dtype=np.float32)
        b = np.ones((20, 10), dtype=np.float32) * 3
        result = _crossfade_stitch([a, b], [0.0, 10.0], [20.0, 30.0], overlap_sec=5)
        # In the blend zone values should be between 1 and 3
        blend_zone = result[10:15]
        assert (blend_zone >= 0.9).all()
        assert (blend_zone <= 3.1).all()


class TestComputeChunks:
    def test_short_video_single_chunk(self):
        chunks = compute_chunks(60.0, window=90, overlap=10)
        assert chunks == [(0.0, 60.0)]

    def test_exact_window(self):
        chunks = compute_chunks(90.0, window=90, overlap=10)
        assert chunks == [(0.0, 90.0)]

    def test_two_chunks(self):
        chunks = compute_chunks(150.0, window=90, overlap=10)
        assert len(chunks) == 2
        assert chunks[0] == (0.0, 90.0)
        assert chunks[1] == (80.0, 150.0)

    def test_overlap_respected(self):
        chunks = compute_chunks(200.0, window=90, overlap=10)
        for i in range(1, len(chunks)):
            prev_end = chunks[i - 1][1]
            curr_start = chunks[i][0]
            assert prev_end - curr_start == pytest.approx(10.0)

    def test_last_chunk_ends_at_duration(self):
        chunks = compute_chunks(250.0, window=90, overlap=10)
        assert chunks[-1][1] == pytest.approx(250.0)
