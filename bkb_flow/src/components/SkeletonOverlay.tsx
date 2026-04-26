import { Stage, Layer, Circle, Line } from 'react-konva';
import { useAnalysisStore } from '../store/analysisStore';
import { POSE_CONNECTIONS } from '../lib/analysis';
import { useEffect, useState } from 'react';

interface ContentBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getContentBounds(
  videoEl: HTMLVideoElement,
  elementW: number,
  elementH: number
): ContentBounds {
  const vW = videoEl.videoWidth;
  const vH = videoEl.videoHeight;
  if (!vW || !vH || !elementW || !elementH) {
    return { x: 0, y: 0, w: elementW, h: elementH };
  }
  const videoAspect = vW / vH;
  const elementAspect = elementW / elementH;
  if (videoAspect > elementAspect) {
    const h = elementW / videoAspect;
    return { x: 0, y: (elementH - h) / 2, w: elementW, h };
  } else {
    const w = elementH * videoAspect;
    return { x: (elementW - w) / 2, y: 0, w, h: elementH };
  }
}

export function SkeletonOverlay() {
  const frames = useAnalysisStore((s) => s.frames);
  const currentFrameIndex = useAnalysisStore((s) => s.currentFrameIndex);
  const videoElement = useAnalysisStore((s) => s.videoElement);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!videoElement) return;
    const update = () => {
      setSize({
        width: videoElement.offsetWidth,
        height: videoElement.offsetHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(videoElement);
    videoElement.addEventListener('loadedmetadata', update);
    return () => {
      observer.disconnect();
      videoElement.removeEventListener('loadedmetadata', update);
    };
  }, [videoElement]);

  const landmarks = frames[currentFrameIndex]?.landmarks;
  if (!landmarks || landmarks.length === 0 || !size.width || !size.height) return null;
  if (!videoElement) return null;

  const { width, height } = size;
  const bounds = getContentBounds(videoElement, width, height);

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
              points={[
                lmA.x * bounds.w + bounds.x,
                lmA.y * bounds.h + bounds.y,
                lmB.x * bounds.w + bounds.x,
                lmB.y * bounds.h + bounds.y,
              ]}
              stroke="#00c853"
              strokeWidth={2}
            />
          );
        })}
        {landmarks.map((lm, i) => (
          <Circle
            key={i}
            x={lm.x * bounds.w + bounds.x}
            y={lm.y * bounds.h + bounds.y}
            radius={4}
            fill="white"
            opacity={lm.visibility}
          />
        ))}
      </Layer>
    </Stage>
  );
}
