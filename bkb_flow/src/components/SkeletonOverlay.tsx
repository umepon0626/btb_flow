import { Stage, Layer, Circle, Line } from 'react-konva';
import { useAnalysisStore } from '../store/analysisStore';
import { POSE_CONNECTIONS } from '../lib/analysis';
import { useEffect, useState } from 'react';

export function SkeletonOverlay() {
  const frames = useAnalysisStore((s) => s.frames);
  const currentFrameIndex = useAnalysisStore((s) => s.currentFrameIndex);
  const videoElement = useAnalysisStore((s) => s.videoElement);
  const [size, setSize] = useState({ width: 640, height: 360 });

  useEffect(() => {
    if (!videoElement) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: videoElement.offsetWidth, height: videoElement.offsetHeight });
    });
    observer.observe(videoElement);
    return () => observer.disconnect();
  }, [videoElement]);

  const landmarks = frames[currentFrameIndex];
  if (!landmarks || landmarks.length === 0) return null;

  const { width, height } = size;

  return (
    <Stage
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      <Layer>
        {POSE_CONNECTIONS.map(([a, b], i) => {
          const lmA = landmarks[a];
          const lmB = landmarks[b];
          if (!lmA || !lmB) return null;
          return (
            <Line
              key={i}
              points={[lmA.x * width, lmA.y * height, lmB.x * width, lmB.y * height]}
              stroke="#00c853"
              strokeWidth={2}
            />
          );
        })}
        {landmarks.map((lm, i) => (
          <Circle key={i} x={lm.x * width} y={lm.y * height} radius={5} fill="white" />
        ))}
      </Layer>
    </Stage>
  );
}
