import { create } from 'zustand'

interface PlaybackState {
  currentTime: number
  duration: number
  isPlaying: boolean
  hemodynamicOffset: number
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  setIsPlaying: (p: boolean) => void
  setHemodynamicOffset: (o: number) => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  hemodynamicOffset: 5,
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),
  setIsPlaying: (p) => set({ isPlaying: p }),
  setHemodynamicOffset: (o) => set({ hemodynamicOffset: o }),
}))
