import type { PoseLandmark } from '../store/analysisStore';

export const LANDMARK_INDICES = {
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];

const STALL_WINDOW_FRAMES = 5;

export function calcWristVy(frames: PoseLandmark[][]): number[] {
  const vy: number[] = [];
  for (let i = 0; i < frames.length - 1; i++) {
    const curr = frames[i][LANDMARK_INDICES.RIGHT_WRIST];
    const next = frames[i + 1][LANDMARK_INDICES.RIGHT_WRIST];
    if (curr && next) {
      vy.push(next.y - curr.y);
    } else {
      vy.push(0);
    }
  }
  return vy;
}

export function detectTwoMotion(vy: number[]): number[] {
  const stallFrames: number[] = [];
  let inLiftPhase = false;
  let stallCount = 0;
  let stallStart = -1;

  for (let i = 0; i < vy.length; i++) {
    if (vy[i] < -0.003) {
      inLiftPhase = true;
    }
    if (inLiftPhase) {
      if (vy[i] >= -0.001) {
        if (stallCount === 0) stallStart = i;
        stallCount++;
        if (stallCount >= STALL_WINDOW_FRAMES) {
          for (let j = stallStart; j <= i; j++) {
            stallFrames.push(j);
          }
        }
      } else {
        stallCount = 0;
        stallStart = -1;
      }
    }
  }
  return [...new Set(stallFrames)];
}
