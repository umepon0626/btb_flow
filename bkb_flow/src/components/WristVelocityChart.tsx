import { useAnalysisStore } from '../store/analysisStore';
import { calcWristVy, detectTwoMotion } from '../lib/analysis';
import { useMemo } from 'react';
import { MetricChart } from './MetricChart';

export function WristVelocityChart() {
  const frames = useAnalysisStore((s) => s.frames);
  const status = useAnalysisStore((s) => s.status);
  const currentFrameIndex = useAnalysisStore((s) => s.currentFrameIndex);

  const { chartData, stallFrames, hasTwoMotion } = useMemo(() => {
    if (frames.length < 2) return { chartData: [], stallFrames: [], hasTwoMotion: false };
    const vy = calcWristVy(frames.map((f) => f.landmarks));
    const stall = detectTwoMotion(vy);
    const data = vy.map((v, i) => ({ frame: i, value: v }));
    return { chartData: data, stallFrames: stall, hasTwoMotion: stall.length > 0 };
  }, [frames]);

  if (status === 'idle' || chartData.length === 0) return null;

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

  return (
    <div>
      <MetricChart
        data={chartData}
        label="手首速度 (Vy)"
        currentFrameIndex={currentFrameIndex}
        referenceAreas={stallRanges}
      />
      <div className={`two-motion-summary ${hasTwoMotion ? 'detected' : 'clean'}`}>
        ツーモーション検出: <strong>{hasTwoMotion ? 'あり ⚠️' : 'なし ✅'}</strong>
      </div>
    </div>
  );
}
