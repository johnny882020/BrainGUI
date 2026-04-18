import { create } from 'zustand'

interface BrainState {
  vertexBuffer: Float32Array | null
  totalFrames: number
  isLoaded: boolean
  colormap: string
  calMin: number
  calMax: number
  highlightedParcelId: number | null
  setVertexBuffer: (buf: Float32Array, frames: number) => void
  setColormap: (c: string) => void
  setCalRange: (min: number, max: number) => void
  setHighlightedParcel: (id: number | null) => void
}

export const useBrainStore = create<BrainState>((set) => ({
  vertexBuffer: null,
  totalFrames: 0,
  isLoaded: false,
  colormap: 'warm',
  calMin: -2,
  calMax: 2,
  highlightedParcelId: null,
  setVertexBuffer: (buf, frames) => set({ vertexBuffer: buf, totalFrames: frames, isLoaded: true }),
  setColormap: (c) => set({ colormap: c }),
  setCalRange: (min, max) => set({ calMin: min, calMax: max }),
  setHighlightedParcel: (id) => set({ highlightedParcelId: id }),
}))
