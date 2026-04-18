import { useEffect, useRef, useCallback } from 'react'
import { Niivue } from '@niivue/niivue'

export interface UseNiivueOptions {
  onReady?: (nv: Niivue) => void
  onMeshNodeClick?: (meshId: string, nodeIndex: number) => void
}

// Niivue's runtime API is broader than its published TypeScript types.
// We use this narrow cast only for the two methods that are under-typed.
type NiivueRuntime = {
  onMeshNodeClick: (meshId: string, nodeIndex: number) => void
  setMeshProperty: (meshIndex: number, key: string, val: unknown) => void
  setMeshLayerProperty: (meshIndex: number, layer: number, key: string, val: unknown) => void
}

export function useNiivue(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  opts?: UseNiivueOptions,
) {
  const nvRef = useRef<Niivue | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const nv = new Niivue({
      backColor: [0.08, 0.08, 0.1, 1],
      show3Dcrosshair: false,
      isOrientCube: false,
    })

    nv.attachToCanvas(canvasRef.current)
    nvRef.current = nv

    nv.loadMeshes([
      { url: '/assets/fsaverage5.lh.surf.gii', rgba255: [180, 180, 190, 255] },
      { url: '/assets/fsaverage5.rh.surf.gii', rgba255: [180, 180, 190, 255] },
    ]).then(() => {
      opts?.onReady?.(nv)
    }).catch((err: unknown) => {
      console.warn('Niivue mesh load failed (assets may not exist yet):', err)
      opts?.onReady?.(nv)
    })

    if (opts?.onMeshNodeClick) {
      const cb = opts.onMeshNodeClick
      ;(nv as unknown as NiivueRuntime).onMeshNodeClick = (meshId, nodeIndex) => cb(meshId, nodeIndex)
    }

    return () => {
      nvRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setFrame = useCallback((frameIndex: number) => {
    const nv = nvRef.current
    if (!nv || !nv.meshes || nv.meshes.length === 0) return
    const rt = nv as unknown as NiivueRuntime
    nv.meshes.forEach((_, i) => {
      rt.setMeshLayerProperty(i, 0, 'frame4D', frameIndex)
    })
    nv.updateGLVolume()
  }, [])

  const setVertexColors = useCallback((values: Float32Array) => {
    const nv = nvRef.current
    if (!nv || !nv.meshes || nv.meshes.length === 0) return
    const lhSize = 10242
    const lhVals = values.slice(0, lhSize)
    const rhVals = values.slice(lhSize, lhSize * 2)
    const rt = nv as unknown as NiivueRuntime
    nv.meshes.forEach((_, i) => {
      rt.setMeshProperty(i, 'vals', i === 0 ? lhVals : rhVals)
    })
    nv.updateGLVolume()
  }, [])

  const setColormap = useCallback((colormap: string, calMin: number, calMax: number) => {
    const nv = nvRef.current
    if (!nv || !nv.meshes) return
    const rt = nv as unknown as NiivueRuntime
    nv.meshes.forEach((_, i) => {
      rt.setMeshProperty(i, 'colormap', colormap)
      rt.setMeshProperty(i, 'cal_min', calMin)
      rt.setMeshProperty(i, 'cal_max', calMax)
    })
    nv.updateGLVolume()
  }, [])

  return { nvRef, setFrame, setVertexColors, setColormap }
}
