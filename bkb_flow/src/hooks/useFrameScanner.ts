import { useEffect, useRef, useCallback } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { initPoseLandmarker } from '../lib/mediapipe';
import { useAnalysisStore } from '../store/analysisStore';
import type { PoseLandmark } from '../store/analysisStore';

type FrameCallback = (now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => void;

const EMA_ALPHA = 0.5;

function calcCentroid(landmarks: PoseLandmark[]): { x: number; y: number } {
  const sum = landmarks.reduce((acc, lm) => ({ x: acc.x + lm.x, y: acc.y + lm.y }), { x: 0, y: 0 });
  return { x: sum.x / landmarks.length, y: sum.y / landmarks.length };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function smoothLandmarks(current: PoseLandmark[], prev: PoseLandmark[] | null): PoseLandmark[] {
  if (!prev) return current;
  return current.map((lm, i) => ({
    x: prev[i] ? prev[i].x * (1 - EMA_ALPHA) + lm.x * EMA_ALPHA : lm.x,
    y: prev[i] ? prev[i].y * (1 - EMA_ALPHA) + lm.y * EMA_ALPHA : lm.y,
    z: prev[i] ? prev[i].z * (1 - EMA_ALPHA) + lm.z * EMA_ALPHA : lm.z,
    visibility: lm.visibility,
  }));
}

export function useFrameScanner(videoEl: HTMLVideoElement | null) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const isScanningRef = useRef(false);
  const frameHandleRef = useRef<number>(0);
  const framesLengthRef = useRef(0);
  const pendingCallbackRef = useRef<FrameCallback | null>(null);
  const smoothedLandmarksRef = useRef<PoseLandmark[] | null>(null);
  const prevCentroidRef = useRef<{ x: number; y: number } | null>(null);
  const centroidVelocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const addFrame = useAnalysisStore((s) => s.addFrame);
  const setStatus = useAnalysisStore((s) => s.setStatus);
  const setCurrentFrameIndex = useAnalysisStore((s) => s.setCurrentFrameIndex);
  const setTrackedCentroid = useAnalysisStore((s) => s.setTrackedCentroid);
  const setCandidatePoses = useAnalysisStore((s) => s.setCandidatePoses);
  const trackedCentroidRef = useRef(useAnalysisStore.getState().trackedCentroid);
  const selectedPersonIndex = useAnalysisStore((s) => s.selectedPersonIndex);
  const selectedPersonIndexRef = useRef(selectedPersonIndex);

  useEffect(() => {
    selectedPersonIndexRef.current = selectedPersonIndex;
  }, [selectedPersonIndex]);

  useEffect(() => {
    const unsub = useAnalysisStore.subscribe((state) => {
      trackedCentroidRef.current = state.trackedCentroid;
    });
    return unsub;
  }, []);

  useEffect(() => {
    initPoseLandmarker().then((lm) => {
      landmarkerRef.current = lm;
    });
  }, []);

  const stopScanning = useCallback(() => {
    const wasScanning = isScanningRef.current;
    isScanningRef.current = false;
    pendingCallbackRef.current = null;
    if (videoEl && frameHandleRef.current) {
      videoEl.cancelVideoFrameCallback(frameHandleRef.current);
      frameHandleRef.current = 0;
    }
    if (wasScanning && framesLengthRef.current > 0) {
      setStatus('done');
    }
  }, [videoEl, setStatus]);

  const startScanning = useCallback(() => {
    if (!videoEl || !landmarkerRef.current) return;
    framesLengthRef.current = 0;
    isScanningRef.current = true;
    pendingCallbackRef.current = null;
    smoothedLandmarksRef.current = null;
    prevCentroidRef.current = null;
    centroidVelocityRef.current = { x: 0, y: 0 };
    setStatus('analyzing');
    setTrackedCentroid(null);
    trackedCentroidRef.current = null;

    const landmarker = landmarkerRef.current;

    const frameCallback: FrameCallback = (_now, metadata) => {
      if (!isScanningRef.current) return;

      const result = landmarker.detectForVideo(videoEl, metadata.mediaTime * 1000);
      if (result.landmarks.length > 0) {
        const allPoses: PoseLandmark[][] = result.landmarks.map((pose) =>
          pose.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            visibility: lm.visibility ?? 0,
          }))
        );

        if (
          framesLengthRef.current === 0 &&
          allPoses.length > 1 &&
          selectedPersonIndexRef.current === null
        ) {
          setCandidatePoses(allPoses);
          pendingCallbackRef.current = frameCallback;
          videoEl.pause();
          return;
        }

        // Velocity-based tracking
        const trackedCentroid = trackedCentroidRef.current;
        let selected: { landmarks: PoseLandmark[]; centroid: { x: number; y: number } } | null =
          null;

        if (allPoses.length === 0) {
          selected = null;
        } else if (trackedCentroid === null) {
          const idx =
            selectedPersonIndexRef.current !== null &&
            selectedPersonIndexRef.current < allPoses.length
              ? selectedPersonIndexRef.current
              : 0;
          const lm = allPoses[idx];
          selected = { landmarks: lm, centroid: calcCentroid(lm) };
        } else {
          // Predict position using velocity
          const predicted = {
            x: trackedCentroid.x + centroidVelocityRef.current.x,
            y: trackedCentroid.y + centroidVelocityRef.current.y,
          };
          let best = -1;
          let bestDist = Infinity;
          for (let i = 0; i < allPoses.length; i++) {
            const c = calcCentroid(allPoses[i]);
            const d = dist(c, predicted);
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          }
          if (best !== -1) {
            const lm = allPoses[best];
            selected = { landmarks: lm, centroid: calcCentroid(lm) };
          }
        }

        if (selected) {
          const smoothed = smoothLandmarks(selected.landmarks, smoothedLandmarksRef.current);
          smoothedLandmarksRef.current = smoothed;

          // Update velocity
          if (prevCentroidRef.current) {
            centroidVelocityRef.current = {
              x: selected.centroid.x - prevCentroidRef.current.x,
              y: selected.centroid.y - prevCentroidRef.current.y,
            };
          }
          prevCentroidRef.current = selected.centroid;

          addFrame(smoothed, metadata.mediaTime);
          setTrackedCentroid(selected.centroid);
          trackedCentroidRef.current = selected.centroid;
          framesLengthRef.current += 1;
          setCurrentFrameIndex(framesLengthRef.current - 1);
        }
      }

      if (!videoEl.ended && !videoEl.paused && isScanningRef.current) {
        frameHandleRef.current = videoEl.requestVideoFrameCallback(frameCallback);
      } else if (videoEl.ended) {
        setStatus('done');
        isScanningRef.current = false;
      }
    };

    frameHandleRef.current = videoEl.requestVideoFrameCallback(frameCallback);
  }, [videoEl, addFrame, setStatus, setCurrentFrameIndex, setTrackedCentroid, setCandidatePoses]);

  const resumeScanning = useCallback(() => {
    if (!videoEl || !pendingCallbackRef.current || !isScanningRef.current) return;
    const cb = pendingCallbackRef.current;
    pendingCallbackRef.current = null;
    videoEl.play();
    frameHandleRef.current = videoEl.requestVideoFrameCallback(cb);
  }, [videoEl]);

  return { startScanning, stopScanning, resumeScanning };
}
