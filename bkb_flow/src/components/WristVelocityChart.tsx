import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { useAnalysisStore } from '../store/analysisStore';
import { calcWristVy, detectTwoMotion } from '../lib/analysis';
import { useMemo } from 'react';

export function WristVelocityChart() {
  const frames = useAnalysisStore((s) => s.frames);
  const status = useAnalysisStore((s) => s.status);

  const { chartData, stallFrames } = useMemo(() => {
    if (frames.length < 2) return { chartData: [], stallFrames: [] };
    const vy = calcWristVy(frames);
    const stall = detectTwoMotion(vy);
    const data = vy.map((v, i) => ({ frame: i, vy: v }));
    return { chartData: data, stallFrames: stall };
  }, [frames]);

  if (status === 'idle' || chartData.length === 0) return null;

  const hasTwoMotion = stallFrames.length > 0;

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

  return (
    <div className="chart-container">
      <h3>手首速度 (Vy)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="frame"
            stroke="#aaa"
            label={{ value: 'フレーム', position: 'insideBottom', offset: -5, fill: '#aaa' }}
          />
          <YAxis stroke="#aaa" />
          <Tooltip
            contentStyle={{ background: '#1a1d2e', border: '1px solid #333', color: '#fff' }}
          />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="4 4" />
          {stallRanges.map((r, i) => (
            <ReferenceArea key={i} x1={r.start} x2={r.end} fill="#f44336" fillOpacity={0.3} />
          ))}
          <Line type="monotone" dataKey="vy" stroke="#00c853" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
      <div className={`two-motion-summary ${hasTwoMotion ? 'detected' : 'clean'}`}>
        ツーモーション検出: <strong>{hasTwoMotion ? 'あり ⚠️' : 'なし ✅'}</strong>
      </div>
    </div>
  );
}
