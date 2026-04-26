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

// Internal EMA utility
function applyEMA(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(result[i - 1] * (1 - alpha) + values[i] * alpha);
  }
  return result;
}

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
  return applyEMA(vy, 0.5);
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

// 3D angle helper using dot product
function calcAngle3D(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

export function calcWristRelPos(frames: PoseLandmark[][]): { x: number[]; y: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const lms of frames) {
    const wrist = lms[LANDMARK_INDICES.RIGHT_WRIST];
    const lHip = lms[LANDMARK_INDICES.LEFT_HIP];
    const rHip = lms[LANDMARK_INDICES.RIGHT_HIP];
    if (wrist && lHip && rHip) {
      const hipCx = (lHip.x + rHip.x) / 2;
      const hipCy = (lHip.y + rHip.y) / 2;
      xs.push(wrist.x - hipCx);
      ys.push(wrist.y - hipCy);
    } else {
      xs.push(0);
      ys.push(0);
    }
  }
  return { x: applyEMA(xs, 0.5), y: applyEMA(ys, 0.5) };
}

export function calcHipTiltAngle(frames: PoseLandmark[][]): number[] {
  const angles: number[] = frames.map((lms) => {
    const shoulder = lms[LANDMARK_INDICES.RIGHT_SHOULDER];
    const hip = lms[LANDMARK_INDICES.RIGHT_HIP];
    const knee = lms[LANDMARK_INDICES.RIGHT_KNEE];
    if (shoulder && hip && knee) return calcAngle3D(shoulder, hip, knee);
    return 0;
  });
  return applyEMA(angles, 0.5);
}

export function calcElbowAngle(frames: PoseLandmark[][]): number[] {
  const angles: number[] = frames.map((lms) => {
    const shoulder = lms[LANDMARK_INDICES.RIGHT_SHOULDER];
    const elbow = lms[LANDMARK_INDICES.RIGHT_ELBOW];
    const wrist = lms[LANDMARK_INDICES.RIGHT_WRIST];
    if (shoulder && elbow && wrist) return calcAngle3D(shoulder, elbow, wrist);
    return 0;
  });
  return applyEMA(angles, 0.5);
}

export function calcArmYawAngle(frames: PoseLandmark[][]): number[] {
  const angles: number[] = frames.map((lms) => {
    const leftShoulder = lms[LANDMARK_INDICES.LEFT_SHOULDER];
    const rightShoulder = lms[LANDMARK_INDICES.RIGHT_SHOULDER];
    const rightWrist = lms[LANDMARK_INDICES.RIGHT_WRIST];
    if (leftShoulder && rightShoulder && rightWrist)
      return calcAngle3D(leftShoulder, rightShoulder, rightWrist);
    return 0;
  });
  return applyEMA(angles, 0.5);
}

export function calcKneeAngle(frames: PoseLandmark[][]): number[] {
  const angles: number[] = frames.map((lms) => {
    const hip = lms[LANDMARK_INDICES.RIGHT_HIP];
    const knee = lms[LANDMARK_INDICES.RIGHT_KNEE];
    const ankle = lms[LANDMARK_INDICES.RIGHT_ANKLE];
    if (hip && knee && ankle) return calcAngle3D(hip, knee, ankle);
    return 0;
  });
  return applyEMA(angles, 0.5);
}

export function calcReleaseAngle(frames: PoseLandmark[][]): number[] {
  const angles: number[] = frames.map((lms) => {
    const shoulder = lms[LANDMARK_INDICES.RIGHT_SHOULDER];
    const wrist = lms[LANDMARK_INDICES.RIGHT_WRIST];
    if (shoulder && wrist) {
      return (Math.atan2(-(wrist.y - shoulder.y), wrist.x - shoulder.x) * 180) / Math.PI;
    }
    return 0;
  });
  return applyEMA(angles, 0.5);
}
