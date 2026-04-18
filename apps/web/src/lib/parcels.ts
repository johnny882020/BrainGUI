import type { Parcel } from '@braingui/types'

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => i + start)
}

// Approximate fsaverage5 vertex indices per region.
// LH vertices: 0–10241, RH vertices: 10242–20483.
// These ranges are anatomical approximations based on published fsaverage5 surface maps.
// Full precision mappings require the HCP parcellation GIFTI file loaded at runtime.
export const PARCELS: Parcel[] = [
  { id: 1,  name: 'V1',      commonName: 'Primary Visual Cortex (V1)',                hemisphere: 'L', vertices: range(0, 300),       description: 'Processes basic visual features: edges, orientation, spatial frequency. Responds strongly to any visual stimulus.' },
  { id: 2,  name: 'V2',      commonName: 'Secondary Visual Cortex (V2)',              hemisphere: 'L', vertices: range(300, 580),     description: 'Early visual processing, border detection, figure-ground separation.' },
  { id: 3,  name: 'V3',      commonName: 'Visual Area V3',                            hemisphere: 'L', vertices: range(580, 820),     description: 'Integrates motion and form information from V1/V2.' },
  { id: 4,  name: 'V4',      commonName: 'Visual Area V4 (Color)',                    hemisphere: 'L', vertices: range(820, 1050),    description: 'Color processing, object recognition. Damage causes achromatopsia.' },
  { id: 5,  name: 'V3A',     commonName: 'Visual Area V3A',                           hemisphere: 'L', vertices: range(1050, 1250),   description: 'Processes global motion and spatial attention.' },
  { id: 6,  name: 'MT',      commonName: 'Middle Temporal Area (V5/MT)',              hemisphere: 'L', vertices: range(1250, 1450),   description: 'Motion perception — tracks moving objects and optic flow. Critical for seeing movement.' },
  { id: 7,  name: 'MST',     commonName: 'Medial Superior Temporal (MST)',            hemisphere: 'L', vertices: range(1450, 1620),   description: 'Processes complex visual motion including optic flow; guides self-motion perception.' },
  { id: 8,  name: 'FEF',     commonName: 'Frontal Eye Field (FEF)',                   hemisphere: 'L', vertices: range(1620, 1800),   description: 'Controls voluntary eye movements and spatial attention shifts.' },
  { id: 9,  name: 'FFA1',    commonName: 'Fusiform Face Area 1 (FFA-1)',              hemisphere: 'L', vertices: range(1800, 1980),   description: 'Face-selective region; responds more to faces than any other object category.' },
  { id: 10, name: 'FFA2',    commonName: 'Fusiform Face Area 2 (FFA-2)',              hemisphere: 'L', vertices: range(1980, 2150),   description: 'Extends face processing; involved in identity recognition and emotional expression reading.' },
  { id: 11, name: 'PPA',     commonName: 'Parahippocampal Place Area (PPA)',          hemisphere: 'L', vertices: range(2150, 2350),   description: 'Scene and place recognition — buildings, landscapes, spatial layouts.' },
  { id: 12, name: 'RSC',     commonName: 'Retrosplenial Cortex (RSC)',                hemisphere: 'L', vertices: range(2350, 2530),   description: 'Spatial navigation, memory for places, contextual associations.' },
  { id: 13, name: 'OPA',     commonName: 'Occipital Place Area (OPA)',                hemisphere: 'L', vertices: range(2530, 2700),   description: 'Encodes navigable space and scene boundaries for spatial navigation.' },
  { id: 14, name: 'EBA',     commonName: 'Extrastriate Body Area (EBA)',              hemisphere: 'L', vertices: range(2700, 2870),   description: 'Responds selectively to images of human bodies and body parts, but not faces.' },
  { id: 15, name: 'A1',      commonName: 'Primary Auditory Cortex (A1)',              hemisphere: 'L', vertices: range(2870, 3100),   description: "Processes basic sound features: frequency, amplitude. Located in Heschl's gyrus." },
  { id: 16, name: 'LBelt',   commonName: 'Lateral Belt Auditory Cortex',              hemisphere: 'L', vertices: range(3100, 3320),   description: 'Processes complex sounds, sound localization, and auditory object recognition.' },
  { id: 17, name: 'A4',      commonName: 'Auditory Area A4',                          hemisphere: 'L', vertices: range(3320, 3520),   description: 'Higher-order auditory processing; responds to speech and tonal patterns.' },
  { id: 18, name: 'STSdp',   commonName: 'Superior Temporal Sulcus (Dorsal Post.)',   hemisphere: 'L', vertices: range(3520, 3750),   description: 'Multisensory integration of audiovisual speech; biological motion perception.' },
  { id: 19, name: 'STSvp',   commonName: 'Superior Temporal Sulcus (Ventral Post.)', hemisphere: 'L', vertices: range(3750, 3970),   description: 'Voice recognition, social perception, audiovisual speech integration.' },
  { id: 20, name: 'TE1a',    commonName: 'Inferior Temporal Area TE1a',               hemisphere: 'L', vertices: range(3970, 4150),   description: 'High-level object recognition and visual memory storage.' },
  { id: 21, name: 'Broca',   commonName: "Broca's Area (IFG)",                        hemisphere: 'L', vertices: range(4150, 4380),   description: 'Language production, syntactic processing, speech planning.' },
  { id: 22, name: 'Wernicke',commonName: "Wernicke's Area (STG/pSTS)",                hemisphere: 'L', vertices: range(4380, 4600),   description: 'Language comprehension, semantic processing, speech perception.' },
  { id: 23, name: 'TPOJ1',   commonName: 'Temporo-Parieto-Occipital Junction',        hemisphere: 'L', vertices: range(4600, 4820),   description: 'Multisensory integration, social cognition, theory of mind, self-other distinction.' },
  { id: 24, name: 'PGp',     commonName: 'Angular Gyrus (PGp)',                       hemisphere: 'L', vertices: range(4820, 5020),   description: 'Semantic integration, reading, mathematical cognition, default mode.' },
  { id: 25, name: 'DMFC',    commonName: 'Dorsomedial Frontal Cortex',                hemisphere: 'L', vertices: range(5020, 5220),   description: 'Action selection, decision-making, error monitoring.' },
  { id: 26, name: 'PCC',     commonName: 'Posterior Cingulate Cortex (PCC)',          hemisphere: 'L', vertices: range(5220, 5430),   description: 'Default mode network hub; self-referential thought, autobiographical memory.' },
  { id: 27, name: 'mPFC',    commonName: 'Medial Prefrontal Cortex (mPFC)',           hemisphere: 'L', vertices: range(5430, 5650),   description: 'Default mode anchor; self-referential processing, social cognition, value-based decisions.' },
  { id: 28, name: 'PF',      commonName: 'Parietal Area PF (Supramarginal Gyrus)',    hemisphere: 'L', vertices: range(5650, 5850),   description: 'Somatosensory integration, phonological working memory, tool use.' },
  { id: 29, name: 'IP1',     commonName: 'Intraparietal Sulcus Area 1 (IPS1)',        hemisphere: 'L', vertices: range(5850, 6050),   description: 'Visuospatial processing, attention, numerical cognition.' },
  { id: 30, name: 'M1',      commonName: 'Primary Motor Cortex (M1)',                 hemisphere: 'L', vertices: range(6050, 6280),   description: 'Executes voluntary movement commands; individual muscles mapped somatotopically.' },
  // Right hemisphere mirrors
  { id: 51, name: 'V1_R',    commonName: 'Primary Visual Cortex (V1) — Right',       hemisphere: 'R', vertices: range(10242, 10542), description: 'Processes basic visual features from the left visual field.' },
  { id: 52, name: 'V2_R',    commonName: 'Secondary Visual Cortex (V2) — Right',     hemisphere: 'R', vertices: range(10542, 10822), description: 'Early visual processing of left visual field.' },
  { id: 53, name: 'MT_R',    commonName: 'Middle Temporal Area (MT) — Right',         hemisphere: 'R', vertices: range(11492, 11692), description: 'Right hemisphere motion processing; contributes to global motion integration.' },
  { id: 54, name: 'FFA1_R',  commonName: 'Fusiform Face Area 1 — Right',             hemisphere: 'R', vertices: range(12042, 12222), description: 'Dominant face-selective region in the right fusiform gyrus.' },
  { id: 55, name: 'FFA2_R',  commonName: 'Fusiform Face Area 2 — Right',             hemisphere: 'R', vertices: range(12222, 12392), description: 'Right hemisphere face identity recognition.' },
  { id: 56, name: 'PPA_R',   commonName: 'Parahippocampal Place Area — Right',       hemisphere: 'R', vertices: range(12392, 12592), description: 'Right hemisphere scene and spatial layout processing.' },
  { id: 57, name: 'A1_R',    commonName: 'Primary Auditory Cortex (A1) — Right',     hemisphere: 'R', vertices: range(13112, 13342), description: "Right hemisphere primary auditory cortex; processes left-ear sounds." },
  { id: 58, name: 'Broca_R', commonName: "Broca's Area — Right (Homologue)",          hemisphere: 'R', vertices: range(14392, 14622), description: 'Right hemisphere language-associated region; prosody and emotional speech processing.' },
  { id: 59, name: 'PCC_R',   commonName: 'Posterior Cingulate Cortex — Right',       hemisphere: 'R', vertices: range(15462, 15672), description: 'Right PCC; default mode network, self-referential processing.' },
  { id: 60, name: 'mPFC_R',  commonName: 'Medial Prefrontal Cortex — Right',         hemisphere: 'R', vertices: range(15672, 15892), description: 'Right mPFC; social cognition, mentalizing, self-referential thought.' },
]

export function computeParcelActivity(
  vertexBuffer: Float32Array,
  frameIndex: number,
  nVertices: number,
): Map<number, number> {
  const activity = new Map<number, number>()
  if (!vertexBuffer.length) return activity
  const offset = frameIndex * nVertices
  for (const parcel of PARCELS) {
    if (!parcel.vertices.length) continue
    let sum = 0
    for (const v of parcel.vertices) sum += vertexBuffer[offset + v]
    activity.set(parcel.id, sum / parcel.vertices.length)
  }
  return activity
}
