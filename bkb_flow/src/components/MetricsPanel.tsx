import { useMemo } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import {
  calcWristVelocityXYZ,
  calcElbowAngle,
  calcKneeAngle,
  calcHipTiltAngle,
  calcArmYawAngle,
  calcReleaseAngle,
  calcWristRelPos,
  calcWristVy,
  detectTwoMotion,
} from '../lib/analysis';
import { CombinedMetricsChart } from './CombinedMetricsChart';

export function MetricsPanel() {
  const frames = useAnalysisStore((s) => s.frames);
  const currentFrameIndex = useAnalysisStore((s) => s.currentFrameIndex);
  const status = useAnalysisStore((s) => s.status);

  const landmarkFrames = useMemo(() => frames.map((f) => f.landmarks), [frames]);

  const metrics = useMemo(() => {
    if (landmarkFrames.length < 2) return null;

    const vy = calcWristVy(landmarkFrames);
    const stallFrames = detectTwoMotion(vy);

    const stallRanges: { start: number; end: number }[] = [];
    if (stallFrames.length > 0) {
      let rangeStart = stallFrames[0];
      let prev = stallFrames[0];
      for (let i = 1; i < stallFrames.length; i++) {
        if (stallFrames[i] !== prev + 1) {
          stallRanges.push({ start: rangeStart, end: prev });
          rangeStart = stallFrames[i];
        }
        prev = stallFrames[i];
      }
      stallRanges.push({ start: rangeStart, end: prev });
    }

    const wristVelocity = calcWristVelocityXYZ(landmarkFrames);
    const wristRelPos = calcWristRelPos(landmarkFrames);

    return {
      rawData: {
        wristVx: wristVelocity.x,
        wristVy: wristVelocity.y,
        wristVz: wristVelocity.z,
        elbow: calcElbowAngle(landmarkFrames),
        knee: calcKneeAngle(landmarkFrames),
        hip: calcHipTiltAngle(landmarkFrames),
        armYaw: calcArmYawAngle(landmarkFrames),
        release: calcReleaseAngle(landmarkFrames),
        wristRelX: wristRelPos.x,
        wristRelY: wristRelPos.y,
        wristRelZ: wristRelPos.z,
      },
      stallRanges,
      hasTwoMotion: stallFrames.length > 0,
    };
  }, [landmarkFrames]);

  if (status === 'idle' || !metrics) return null;

  return (
    <div className="metrics-panel">
      <CombinedMetricsChart
        rawData={metrics.rawData}
        currentFrameIndex={currentFrameIndex}
        stallRanges={metrics.stallRanges}
      />
      <div className={`two-motion-summary ${metrics.hasTwoMotion ? 'detected' : 'clean'}`}>
        ツーモーション検出: <strong>{metrics.hasTwoMotion ? 'あり ⚠️' : 'なし ✅'}</strong>
      </div>
    </div>
  );
}
