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

interface MetricChartProps {
  data: { frame: number; value: number }[];
  label: string;
  unit?: string;
  currentFrameIndex: number;
  referenceAreas?: { start: number; end: number; color: string }[];
  yDomain?: [number | 'auto', number | 'auto'];
}

export function MetricChart({
  data,
  label,
  unit,
  currentFrameIndex,
  referenceAreas,
  yDomain,
}: MetricChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="chart-container">
      <h3>
        {label}
        {unit ? ` (${unit})` : ''}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="frame"
            stroke="#aaa"
            label={{ value: 'フレーム', position: 'insideBottom', offset: -5, fill: '#aaa' }}
          />
          <YAxis stroke="#aaa" domain={yDomain} />
          <Tooltip
            contentStyle={{ background: '#1a1d2e', border: '1px solid #333', color: '#fff' }}
          />
          {referenceAreas?.map((area, i) => (
            <ReferenceArea
              key={i}
              x1={area.start}
              x2={area.end}
              fill={area.color}
              fillOpacity={0.3}
            />
          ))}
          <ReferenceLine x={currentFrameIndex} stroke="#FFD700" strokeWidth={2} />
          <Line type="monotone" dataKey="value" stroke="#00c853" dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
