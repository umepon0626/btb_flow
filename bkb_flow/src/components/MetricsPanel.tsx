import { useMemo } from 'react';
import { useAnalysisStore } from '../store/analysisStore';
import {
  calcWristVy,
  calcElbowAngle,
  calcKneeAngle,
  calcHipTiltAngle,
  calcArmYawAngle,
  calcReleaseAngle,
  calcWristRelPos,
  detectTwoMotion,
} from '../lib/analysis';
import { MetricChart } from './MetricChart';

export function MetricsPanel() {
  const frames = useAnalysisStore((s) => s.frames);
  const currentFrameIndex = useAnalysisStore((s) => s.currentFrameIndex);
  const status = useAnalysisStore((s) => s.status);

  const landmarkFrames = useMemo(() => frames.map((f) => f.landmarks), [frames]);

  const metrics = useMemo(() => {
    if (landmarkFrames.length < 2) return null;

    const vy = calcWristVy(landmarkFrames);
    const stallFrames = detectTwoMotion(vy);
    const vyData = vy.map((v, i) => ({ frame: i, value: v }));

    const stallRanges: { start: number; end: number; color: string }[] = [];
    if (stallFrames.length > 0) {
      let rangeStart = stallFrames[0];
      let prev = stallFrames[0];
      for (let i = 1; i < stallFrames.length; i++) {
        if (stallFrames[i] !== prev + 1) {
          stallRanges.push({ start: rangeStart, end: prev, color: '#f44336' });
          rangeStart = stallFrames[i];
        }
        prev = stallFrames[i];
      }
      stallRanges.push({ start: rangeStart, end: prev, color: '#f44336' });
    }

    const elbowAngles = calcElbowAngle(landmarkFrames);
    const kneeAngles = calcKneeAngle(landmarkFrames);
    const hipAngles = calcHipTiltAngle(landmarkFrames);
    const armYawAngles = calcArmYawAngle(landmarkFrames);
    const releaseAngles = calcReleaseAngle(landmarkFrames);
    const wristRelPos = calcWristRelPos(landmarkFrames);

    return {
      vyData,
      stallRanges,
      hasTwoMotion: stallFrames.length > 0,
      elbowData: elbowAngles.map((v, i) => ({ frame: i, value: v })),
      kneeData: kneeAngles.map((v, i) => ({ frame: i, value: v })),
      hipData: hipAngles.map((v, i) => ({ frame: i, value: v })),
      armYawData: armYawAngles.map((v, i) => ({ frame: i, value: v })),
      releaseData: releaseAngles.map((v, i) => ({ frame: i, value: v })),
      wristRelYData: wristRelPos.y.map((v, i) => ({ frame: i, value: v })),
    };
  }, [landmarkFrames]);

  if (status === 'idle' || !metrics) return null;

  return (
    <div className="metrics-panel">
      <MetricChart
        data={metrics.vyData}
        label="手首速度 (Vy)"
        currentFrameIndex={currentFrameIndex}
        referenceAreas={metrics.stallRanges}
      />
      <div className={`two-motion-summary ${metrics.hasTwoMotion ? 'detected' : 'clean'}`}>
        ツーモーション検出: <strong>{metrics.hasTwoMotion ? 'あり ⚠️' : 'なし ✅'}</strong>
      </div>
      <MetricChart
        data={metrics.elbowData}
        label="右肘角度"
        unit="°"
        currentFrameIndex={currentFrameIndex}
        yDomain={[0, 180]}
      />
      <MetricChart
        data={metrics.kneeData}
        label="右膝角度"
        unit="°"
        currentFrameIndex={currentFrameIndex}
        yDomain={[0, 180]}
      />
      <MetricChart
        data={metrics.hipData}
        label="腰前屈角"
        unit="°"
        currentFrameIndex={currentFrameIndex}
        yDomain={[0, 180]}
      />
      <MetricChart
        data={metrics.armYawData}
        label="右腕ヨー角"
        unit="°"
        currentFrameIndex={currentFrameIndex}
        yDomain={[0, 180]}
      />
      <MetricChart
        data={metrics.releaseData}
        label="リリース角度"
        unit="°"
        currentFrameIndex={currentFrameIndex}
        yDomain={[-180, 180]}
      />
      <MetricChart
        data={metrics.wristRelYData}
        label="手首相対位置 Y"
        unit="正規化"
        currentFrameIndex={currentFrameIndex}
      />
    </div>
  );
}
