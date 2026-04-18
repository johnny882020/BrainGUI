declare class Float16Array {
  constructor(buffer: ArrayBuffer)
  [index: number]: number
  readonly length: number
}

function float16ToFloat32(h: number): number {
  const s = (h & 0x8000) >> 15
  const e = (h & 0x7c00) >> 10
  const f = h & 0x03ff
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024)
  if (e === 31) return f ? NaN : (s ? -1 : 1) * Infinity
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024)
}

export function decodeFloat16Buffer(buffer: ArrayBuffer): Float32Array {
  const totalElements = buffer.byteLength / 2
  const out = new Float32Array(totalElements)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (globalThis as any).Float16Array !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f16 = new (globalThis as any).Float16Array(buffer) as Float16Array
    for (let i = 0; i < totalElements; i++) out[i] = f16[i]
  } else {
    const view = new DataView(buffer)
    for (let i = 0; i < totalElements; i++) {
      out[i] = float16ToFloat32(view.getUint16(i * 2, true))
    }
  }
  return out
}

export interface VertexBinHeader {
  totalFrames: number
  nVertices: number
}

export function parseVertexBin(buffer: ArrayBuffer): { header: VertexBinHeader; data: Float32Array } {
  const header = new Uint32Array(buffer, 0, 2)
  const totalFrames = header[0]
  const nVertices = header[1]
  const dataBuffer = buffer.slice(8)
  const data = decodeFloat16Buffer(dataBuffer)
  return { header: { totalFrames, nVertices }, data }
}

export function getFrameSlice(data: Float32Array, frameIndex: number, nVertices: number): Float32Array {
  const offset = frameIndex * nVertices
  return data.subarray(offset, offset + nVertices)
}
