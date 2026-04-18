"""Stitch TRIBE v2 chunk predictions into a single float16 binary blob."""
import struct
from pathlib import Path

import numpy as np


N_VERTICES = 20484


def stitch_chunks_to_bin(
    chunk_results: list[dict],
    output_path: Path,
    n_vertices: int = N_VERTICES,
    overlap_sec: int = 10,
) -> int:
    """
    Blend overlapping chunk predictions with a raised-cosine crossfade,
    z-score across time, write as float16 little-endian.

    Wire format:
      - Header: 8 bytes = uint32 T_total, uint32 n_vertices
      - Data:   T_total * n_vertices * 2 bytes (float16, row-major)

    Returns total frame count T_total.
    """
    if not chunk_results:
        raise ValueError("No chunk results to stitch")

    # Sort by chunk index
    sorted_chunks = sorted(chunk_results, key=lambda c: c["chunk_index"])

    arrays: list[np.ndarray] = []
    start_secs: list[float] = []
    end_secs: list[float] = []

    for chunk in sorted_chunks:
        arr = np.array(chunk["vertex_data"], dtype=np.float32)
        if arr.ndim != 2 or arr.shape[1] != n_vertices:
            raise ValueError(f"Unexpected vertex data shape: {arr.shape}")
        arrays.append(arr)
        start_secs.append(float(chunk["start_sec"]))
        end_secs.append(float(chunk["end_sec"]))

    if len(arrays) == 1:
        result = arrays[0]
    else:
        result = _crossfade_stitch(arrays, start_secs, end_secs, overlap_sec)

    # Z-score across time per vertex (avoid division by zero with eps)
    mean = result.mean(axis=0, keepdims=True)
    std = result.std(axis=0, keepdims=True) + 1e-8
    result = (result - mean) / std

    total_frames = result.shape[0]
    out = result.astype(np.float16)

    with open(output_path, "wb") as f:
        f.write(struct.pack("<II", total_frames, n_vertices))
        f.write(out.tobytes())

    return total_frames


def _crossfade_stitch(
    arrays: list[np.ndarray],
    start_secs: list[float],
    end_secs: list[float],
    overlap_sec: int,
) -> np.ndarray:
    """Concatenate chunks, blending the overlap regions with a raised-cosine fade."""
    pieces = [arrays[0]]

    for i in range(1, len(arrays)):
        prev = pieces[-1]
        curr = arrays[i]

        # Actual overlap in frames (1 Hz → overlap_sec frames)
        overlap_frames = min(overlap_sec, prev.shape[0], curr.shape[0])

        if overlap_frames <= 0:
            pieces.append(curr)
            continue

        # Raised-cosine blend weights
        t = np.linspace(0, np.pi, overlap_frames, dtype=np.float32)
        fade_out = ((1 + np.cos(t)) / 2).reshape(-1, 1)
        fade_in = 1.0 - fade_out

        blended = prev[-overlap_frames:] * fade_out + curr[:overlap_frames] * fade_in

        new_piece = np.concatenate([prev[:-overlap_frames], blended, curr[overlap_frames:]], axis=0)
        pieces[-1] = new_piece

    return pieces[-1]
