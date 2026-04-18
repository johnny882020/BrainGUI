export type JobStatus =
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'running_inference'
  | 'stitching'
  | 'uploading'
  | 'complete'
  | 'failed';

export interface Job {
  id: string;
  videoUrl: string;
  sha256: string | null;
  status: JobStatus;
  progressPct: number;
  durationSec: number | null;
  vertexBlobUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SSEProgressEvent {
  jobId: string;
  status: JobStatus;
  progressPct: number;
  message: string;
}

export interface CreateJobRequest {
  videoUrl: string;
}

export interface CreateJobResponse {
  id: string;
  shareUrl: string;
}

export interface VertexUrlResponse {
  url: string;
  expiresAt: string;
}

export interface InferenceRequest {
  jobId: string;
  videoKey: string;
  audioKey: string;
  chunkIndex: number;
  startSec: number;
  endSec: number;
}

export interface Parcel {
  id: number;
  name: string;
  commonName: string;
  description: string;
  hemisphere: 'L' | 'R';
  vertices: number[];
}
