import { useEffect, useRef, useCallback } from 'react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { initPoseLandmarker } from '../lib/mediapipe';
import { useAnalysisStore } from '../store/analysisStore';

export function useFrameScanner(videoEl: HTMLVideoElement | null) {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const isScanningRef = useRef(false);
  const frameHandleRef = useRef<number>(0);
  const addFrame = useAnalysisStore((s) => s.addFrame);
  const setStatus = useAnalysisStore((s) => s.setStatus);
  const setCurrentFrameIndex = useAnalysisStore((s) => s.setCurrentFrameIndex);
  const framesLengthRef = useRef(0);

  useEffect(() => {
    initPoseLandmarker().then((lm) => {
      landmarkerRef.current = lm;
    });
  }, []);

  const stopScanning = useCallback(() => {
    isScanningRef.current = false;
    if (videoEl && frameHandleRef.current) {
      videoEl.cancelVideoFrameCallback(frameHandleRef.current);
      frameHandleRef.current = 0;
    }
  }, [videoEl]);

  const startScanning = useCallback(() => {
    if (!videoEl || !landmarkerRef.current) return;
    isScanningRef.current = true;
    setStatus('analyzing');

    const landmarker = landmarkerRef.current;

    const frameCallback = (_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
      if (!isScanningRef.current) return;

      const result = landmarker.detectForVideo(videoEl, metadata.mediaTime * 1000);
      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0].map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility ?? 0,
        }));
        addFrame(landmarks);
        framesLengthRef.current += 1;
        setCurrentFrameIndex(framesLengthRef.current - 1);
      }

      if (!videoEl.ended && !videoEl.paused && isScanningRef.current) {
        frameHandleRef.current = videoEl.requestVideoFrameCallback(frameCallback);
      } else if (videoEl.ended) {
        setStatus('done');
        isScanningRef.current = false;
      }
    };

    frameHandleRef.current = videoEl.requestVideoFrameCallback(frameCallback);
  }, [videoEl, addFrame, setStatus, setCurrentFrameIndex]);

  return { startScanning, stopScanning };
}
