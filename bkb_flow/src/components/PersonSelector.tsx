import { Stage, Layer, Circle, Line, Text, Rect } from 'react-konva';
import { useAnalysisStore } from '../store/analysisStore';
import { POSE_CONNECTIONS } from '../lib/analysis';
import { useState, useEffect, Fragment } from 'react';
import type { PoseLandmark } from '../store/analysisStore';

const PERSON_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF'];

function calcBBox(lms: PoseLandmark[]): { x: number; y: number; w: number; h: number } {
  const xs = lms.map((l) => l.x);
  const ys = lms.map((l) => l.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(...xs) - minX,
    h: Math.max(...ys) - minY,
  };
}

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
  if (!vW || !vH || !elementW || !elementH) return { x: 0, y: 0, w: elementW, h: elementH };
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

export function PersonSelector() {
  const candidatePoses = useAnalysisStore((s) => s.candidatePoses);
  const selectedPersonIndex = useAnalysisStore((s) => s.selectedPersonIndex);
  const setSelectedPersonIndex = useAnalysisStore((s) => s.setSelectedPersonIndex);
  const videoElement = useAnalysisStore((s) => s.videoElement);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!videoElement) return;
    const update = () =>
      setSize({ width: videoElement.offsetWidth, height: videoElement.offsetHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(videoElement);
    return () => obs.disconnect();
  }, [videoElement]);

  if (!candidatePoses.length || !size.width || !videoElement) return null;

  const { width, height } = size;
  const bounds = getContentBounds(videoElement, width, height);

  const toScreen = (x: number, y: number) => ({
    sx: x * bounds.w + bounds.x,
    sy: y * bounds.h + bounds.y,
  });

  return (
    <Stage
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, cursor: 'pointer' }}
    >
      <Layer>
        {candidatePoses.map((pose, pi) => {
          const color = PERSON_COLORS[pi % PERSON_COLORS.length];
          const isSelected = selectedPersonIndex === pi;
          const bbox = calcBBox(pose);
          const { sx: bx, sy: by } = toScreen(bbox.x, bbox.y);
          const bw = bbox.w * bounds.w;
          const bh = bbox.h * bounds.h;

          return (
            <Fragment key={pi}>
              <Rect
                x={bx - 8}
                y={by - 8}
                width={bw + 16}
                height={bh + 16}
                stroke={color}
                strokeWidth={isSelected ? 4 : 2}
                fill={isSelected ? `${color}22` : 'transparent'}
                cornerRadius={4}
                onClick={() => setSelectedPersonIndex(pi)}
              />
              <Rect
                x={bx - 8}
                y={by - 30}
                width={60}
                height={24}
                fill={color}
                cornerRadius={4}
                onClick={() => setSelectedPersonIndex(pi)}
              />
              <Text
                x={bx - 8}
                y={by - 26}
                width={60}
                text={`人物 ${pi + 1}`}
                fontSize={13}
                fill="#0f1117"
                fontStyle="bold"
                align="center"
                onClick={() => setSelectedPersonIndex(pi)}
              />
              {POSE_CONNECTIONS.map(([a, b], li) => {
                const lmA = pose[a];
                const lmB = pose[b];
                if (!lmA || !lmB) return null;
                const { sx: ax, sy: ay } = toScreen(lmA.x, lmA.y);
                const { sx: bxp, sy: byp } = toScreen(lmB.x, lmB.y);
                return (
                  <Line
                    key={li}
                    points={[ax, ay, bxp, byp]}
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.7}
                  />
                );
              })}
              {pose.map((lm, li) => {
                const { sx, sy } = toScreen(lm.x, lm.y);
                return (
                  <Circle key={li} x={sx} y={sy} radius={3} fill={color} opacity={lm.visibility} />
                );
              })}
            </Fragment>
          );
        })}
      </Layer>
    </Stage>
  );
}
