import { useEffect, useRef, useCallback } from 'react'
import { Niivue } from '@niivue/niivue'

export interface UseNiivueOptions {
  onReady?: (nv: Niivue) => void
  onMeshNodeClick?: (meshId: string, nodeIndex: number) => void
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

    nv.onMeshNodeClick = (meshId: string, nodeIndex: number) => {
      opts?.onMeshNodeClick?.(meshId, nodeIndex)
    }

    return () => {
      nvRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setFrame = useCallback((frameIndex: number) => {
    const nv = nvRef.current
    if (!nv || !nv.meshes || nv.meshes.length === 0) return
    nv.meshes.forEach((mesh) => {
      if (mesh.layers && mesh.layers.length > 0) {
        nv.setMeshLayerProperty(mesh.id, 0, 'frame4D', frameIndex)
      }
    })
    nv.updateGLVolume()
  }, [])

  const setVertexColors = useCallback((values: Float32Array) => {
    const nv = nvRef.current
    if (!nv || !nv.meshes || nv.meshes.length === 0) return
    const lhSize = 10242
    const lhVals = values.slice(0, lhSize)
    const rhVals = values.slice(lhSize, lhSize * 2)
    nv.meshes.forEach((mesh, i) => {
      nv.setMeshProperty(mesh.id, 'vals', i === 0 ? lhVals : rhVals)
    })
    nv.updateGLVolume()
  }, [])

  const setColormap = useCallback((colormap: string, calMin: number, calMax: number) => {
    const nv = nvRef.current
    if (!nv || !nv.meshes) return
    nv.meshes.forEach((mesh) => {
      nv.setMeshProperty(mesh.id, 'colormap', colormap)
      nv.setMeshProperty(mesh.id, 'cal_min', calMin)
      nv.setMeshProperty(mesh.id, 'cal_max', calMax)
    })
    nv.updateGLVolume()
  }, [])

  return { nvRef, setFrame, setVertexColors, setColormap }
}
