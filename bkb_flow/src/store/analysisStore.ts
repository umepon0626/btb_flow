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
  setVideoUrl: (url: string | null) => void;
  setVideoElement: (el: HTMLVideoElement | null) => void;
  addFrame: (landmarks: PoseLandmark[]) => void;
  setCurrentFrameIndex: (index: number) => void;
  setStatus: (status: AnalysisState['status']) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  videoUrl: null,
  videoElement: null,
  frames: [],
  currentFrameIndex: 0,
  status: 'idle',
  fps: 30,
  setVideoUrl: (url) => set({ videoUrl: url }),
  setVideoElement: (el) => set({ videoElement: el }),
  addFrame: (landmarks) => set((state) => ({ frames: [...state.frames, landmarks] })),
  setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),
  setStatus: (status) => set({ status }),
  reset: () => set({ frames: [], currentFrameIndex: 0, status: 'idle' }),
}));
