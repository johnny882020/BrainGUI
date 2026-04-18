import type { Parcel } from '@braingui/types'

export const PARCELS: Parcel[] = [
  { id: 1, name: 'V1', commonName: 'Primary Visual Cortex (V1)', description: 'Processes basic visual features: edges, orientation, spatial frequency. Responds strongly to any visual stimulus.', hemisphere: 'L', vertices: [] },
  { id: 2, name: 'V2', commonName: 'Secondary Visual Cortex (V2)', description: 'Early visual processing, border detection, figure-ground separation.', hemisphere: 'L', vertices: [] },
  { id: 3, name: 'V3', commonName: 'Visual Area V3', description: 'Integrates motion and form information from V1/V2.', hemisphere: 'L', vertices: [] },
  { id: 4, name: 'V4', commonName: 'Visual Area V4 (Color)', description: 'Color processing, object recognition. Damage causes achromatopsia.', hemisphere: 'L', vertices: [] },
  { id: 5, name: 'V3A', commonName: 'Visual Area V3A', description: 'Processes global motion and spatial attention.', hemisphere: 'L', vertices: [] },
  { id: 6, name: 'MT', commonName: 'Middle Temporal Area (V5/MT)', description: 'Motion perception — tracks moving objects and optic flow. Critical for seeing movement.', hemisphere: 'L', vertices: [] },
  { id: 7, name: 'MST', commonName: 'Medial Superior Temporal (MST)', description: 'Processes complex visual motion including optic flow; guides self-motion perception.', hemisphere: 'L', vertices: [] },
  { id: 8, name: 'FEF', commonName: 'Frontal Eye Field (FEF)', description: 'Controls voluntary eye movements and spatial attention shifts.', hemisphere: 'L', vertices: [] },
  { id: 9, name: 'FFA1', commonName: 'Fusiform Face Area 1 (FFA-1)', description: 'Face-selective region; responds more to faces than any other object category.', hemisphere: 'L', vertices: [] },
  { id: 10, name: 'FFA2', commonName: 'Fusiform Face Area 2 (FFA-2)', description: 'Extends face processing; involved in identity recognition and emotional expression reading.', hemisphere: 'L', vertices: [] },
  { id: 11, name: 'PPA', commonName: 'Parahippocampal Place Area (PPA)', description: 'Scene and place recognition — buildings, landscapes, spatial layouts.', hemisphere: 'L', vertices: [] },
  { id: 12, name: 'RSC', commonName: 'Retrosplenial Cortex (RSC)', description: 'Spatial navigation, memory for places, contextual associations.', hemisphere: 'L', vertices: [] },
  { id: 13, name: 'OPA', commonName: 'Occipital Place Area (OPA)', description: 'Encodes navigable space and scene boundaries for spatial navigation.', hemisphere: 'L', vertices: [] },
  { id: 14, name: 'EBA', commonName: 'Extrastriate Body Area (EBA)', description: 'Responds selectively to images of human bodies and body parts, but not faces.', hemisphere: 'L', vertices: [] },
  { id: 15, name: 'A1', commonName: 'Primary Auditory Cortex (A1)', description: 'Processes basic sound features: frequency, amplitude. Located in Heschl\'s gyrus.', hemisphere: 'L', vertices: [] },
  { id: 16, name: 'LBelt', commonName: 'Lateral Belt Auditory Cortex', description: 'Processes complex sounds, sound localization, and auditory object recognition.', hemisphere: 'L', vertices: [] },
  { id: 17, name: 'A4', commonName: 'Auditory Area A4', description: 'Higher-order auditory processing; responds to speech and tonal patterns.', hemisphere: 'L', vertices: [] },
  { id: 18, name: 'STSdp', commonName: 'Superior Temporal Sulcus (Dorsal Posterior)', description: 'Multisensory integration of audiovisual speech; biological motion perception.', hemisphere: 'L', vertices: [] },
  { id: 19, name: 'STSvp', commonName: 'Superior Temporal Sulcus (Ventral Posterior)', description: 'Voice recognition, social perception, audiovisual speech integration.', hemisphere: 'L', vertices: [] },
  { id: 20, name: 'TE1a', commonName: 'Inferior Temporal Area TE1a', description: 'High-level object recognition and visual memory storage.', hemisphere: 'L', vertices: [] },
  { id: 21, name: 'Broca', commonName: 'Broca\'s Area (IFG)', description: 'Language production, syntactic processing, speech planning.', hemisphere: 'L', vertices: [] },
  { id: 22, name: 'Wernicke', commonName: 'Wernicke\'s Area (STG/pSTS)', description: 'Language comprehension, semantic processing, speech perception.', hemisphere: 'L', vertices: [] },
  { id: 23, name: 'TPOJ1', commonName: 'Temporo-Parieto-Occipital Junction', description: 'Multisensory integration, social cognition, theory of mind, self-other distinction.', hemisphere: 'L', vertices: [] },
  { id: 24, name: 'PGp', commonName: 'Angular Gyrus (PGp)', description: 'Semantic integration, reading, mathematical cognition, default mode.', hemisphere: 'L', vertices: [] },
  { id: 25, name: 'DMFC', commonName: 'Dorsomedial Frontal Cortex', description: 'Action selection, decision-making, error monitoring.', hemisphere: 'L', vertices: [] },
  { id: 26, name: 'PCC', commonName: 'Posterior Cingulate Cortex (PCC)', description: 'Default mode network hub; self-referential thought, autobiographical memory.', hemisphere: 'L', vertices: [] },
  { id: 27, name: 'mPFC', commonName: 'Medial Prefrontal Cortex (mPFC)', description: 'Default mode anchor; self-referential processing, social cognition, value-based decisions.', hemisphere: 'L', vertices: [] },
  { id: 28, name: 'PF', commonName: 'Parietal Area PF (Supramarginal Gyrus)', description: 'Somatosensory integration, phonological working memory, tool use.', hemisphere: 'L', vertices: [] },
  { id: 29, name: 'IP1', commonName: 'Intraparietal Sulcus Area 1 (IPS1)', description: 'Visuospatial processing, attention, numerical cognition.', hemisphere: 'L', vertices: [] },
  { id: 30, name: 'M1', commonName: 'Primary Motor Cortex (M1)', description: 'Executes voluntary movement commands; individual muscles mapped somatotopically.', hemisphere: 'L', vertices: [] },
  { id: 51, name: 'V1_R', commonName: 'Primary Visual Cortex (V1) — Right', description: 'Processes basic visual features from the left visual field.', hemisphere: 'R', vertices: [] },
  { id: 56, name: 'MT_R', commonName: 'Middle Temporal Area (MT) — Right', description: 'Right hemisphere motion processing; contributes to global motion integration.', hemisphere: 'R', vertices: [] },
  { id: 59, name: 'FFA1_R', commonName: 'Fusiform Face Area 1 — Right', description: 'Dominant face-selective region in the right fusiform gyrus.', hemisphere: 'R', vertices: [] },
  { id: 60, name: 'FFA2_R', commonName: 'Fusiform Face Area 2 — Right', description: 'Right hemisphere face identity recognition.', hemisphere: 'R', vertices: [] },
  { id: 61, name: 'PPA_R', commonName: 'Parahippocampal Place Area — Right', description: 'Right hemisphere scene and spatial layout processing.', hemisphere: 'R', vertices: [] },
]

export function computeParcelActivity(
  vertexBuffer: Float32Array,
  frameIndex: number,
  nVertices: number,
): Map<number, number> {
  const activity = new Map<number, number>()
  if (vertexBuffer.length === 0) return activity
  const offset = frameIndex * nVertices
  for (const parcel of PARCELS) {
    if (parcel.vertices.length === 0) continue
    const mean = parcel.vertices.reduce((sum, v) => sum + vertexBuffer[offset + v], 0) / parcel.vertices.length
    activity.set(parcel.id, mean)
  }
  return activity
}
