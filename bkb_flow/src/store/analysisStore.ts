import { create } from 'zustand';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface AnalysisState {
  videoUrl: string | null;
  videoElement: HTMLVideoElement | null;
  frames: PoseLandmark[][];
  currentFrameIndex: number;
  status: 'idle' | 'analyzing' | 'done' | 'error';
  fps: number;
  referenceImageUrl: string | null;
  candidatePoses: PoseLandmark[][];
  selectedPersonIndex: number | null;
  trackedCentroid: { x: number; y: number } | null;
  setVideoUrl: (url: string | null) => void;
  setVideoElement: (el: HTMLVideoElement | null) => void;
  addFrame: (landmarks: PoseLandmark[]) => void;
  setCurrentFrameIndex: (index: number) => void;
  setStatus: (status: AnalysisState['status']) => void;
  setReferenceImageUrl: (url: string | null) => void;
  setCandidatePoses: (poses: PoseLandmark[][]) => void;
  setSelectedPersonIndex: (index: number | null) => void;
  setTrackedCentroid: (centroid: { x: number; y: number } | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  videoUrl: null,
  videoElement: null,
  frames: [],
  currentFrameIndex: 0,
  status: 'idle',
  fps: 30,
  referenceImageUrl: null,
  candidatePoses: [],
  selectedPersonIndex: null,
  trackedCentroid: null,
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoElement: (el) => set({ videoElement: el }),
  addFrame: (landmarks) => set((state) => ({ frames: [...state.frames, landmarks] })),
  setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),
  setStatus: (status) => set({ status }),
  setReferenceImageUrl: (url) => set({ referenceImageUrl: url }),
  setCandidatePoses: (poses) => set({ candidatePoses: poses }),
  setSelectedPersonIndex: (index) => set({ selectedPersonIndex: index }),
  setTrackedCentroid: (centroid) => set({ trackedCentroid: centroid }),
  reset: () =>
    set({
      frames: [],
      currentFrameIndex: 0,
      status: 'idle',
      candidatePoses: [],
      selectedPersonIndex: null,
      trackedCentroid: null,
    }),
}));
