import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';

const METRIC_DEFS = [
  { key: 'wristVx',   label: '手首速度 Vx',      color: '#00c853', unit: '' },
  { key: 'wristVy',   label: '手首速度 Vy',      color: '#69f0ae', unit: '' },
  { key: 'wristVz',   label: '手首速度 Vz',      color: '#b9f6ca', unit: '' },
  { key: 'elbow',     label: '右肘角度',           color: '#2196F3', unit: '°' },
  { key: 'knee',      label: '右膝角度',           color: '#FF9800', unit: '°' },
  { key: 'hip',       label: '腰前屈角',           color: '#E91E63', unit: '°' },
  { key: 'armYaw',    label: '右腕ヨー角',         color: '#9C27B0', unit: '°' },
  { key: 'release',   label: 'リリース角度',       color: '#00BCD4', unit: '°' },
  { key: 'wristRelX', label: '手首相対位置 X',    color: '#FF5722', unit: '' },
  { key: 'wristRelY', label: '手首相対位置 Y',    color: '#FF8A65', unit: '' },
  { key: 'wristRelZ', label: '手首相対位置 Z',    color: '#FFCCBC', unit: '' },
] as const;

type MetricKey = (typeof METRIC_DEFS)[number]['key'];

interface CombinedMetricsChartProps {
  rawData: Record<MetricKey, number[]>;
  currentFrameIndex: number;
  stallRanges: { start: number; end: number }[];
}

interface TooltipPayloadItem {
  dataKey?: string | number | ((obj: unknown) => unknown);
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: readonly TooltipPayloadItem[];
  label?: string | number;
  rawData: Record<MetricKey, number[]>;
}

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 50);
  return values.map((v) => ((v - min) / range) * 100);
}

function CustomTooltip({ active, payload, label, rawData }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1d2e', border: '1px solid #333', padding: '8px', color: '#fff', fontSize: '12px' }}>
      <p style={{ margin: 0 }}>フレーム: {label}</p>
      {payload.map((p) => {
        const def = METRIC_DEFS.find((d) => d.key === String(p.dataKey));
        if (!def) return null;
        const rawValue = rawData[def.key][Number(label)];
        return (
          <p key={String(p.dataKey ?? '')} style={{ margin: '2px 0', color: p.color }}>
            {def.label}: {rawValue !== undefined ? rawValue.toFixed(3) : '-'}{def.unit}
          </p>
        );
      })}
    </div>
  );
}

export function CombinedMetricsChart({ rawData, currentFrameIndex, stallRanges }: CombinedMetricsChartProps) {
  const [enabled, setEnabled] = useState<Record<MetricKey, boolean>>(
    () => Object.fromEntries(METRIC_DEFS.map(({ key }) => [key, true])) as Record<MetricKey, boolean>
  );

  const chartData = useMemo(() => {
    const frameCount = rawData[METRIC_DEFS[0].key].length;
    const normalizedData = Object.fromEntries(
      METRIC_DEFS.map(({ key }) => [key, normalize(rawData[key])])
    ) as Record<MetricKey, number[]>;

    return Array.from({ length: frameCount }, (_, i) => ({
      frame: i,
      ...Object.fromEntries(METRIC_DEFS.map(({ key }) => [key, normalizedData[key][i] ?? null])),
    }));
  }, [rawData]);

  return (
    <div>
      <div className="metric-toggles">
        {METRIC_DEFS.map(({ key, label, color }) => (
          <label key={key} className="metric-toggle" style={{ '--metric-color': color } as React.CSSProperties}>
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={(e) => setEnabled((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
          <XAxis dataKey="frame" tick={{ fontSize: 10, fill: '#888' }} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#888' }}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} rawData={rawData} />} />
          {stallRanges.map((r, i) => (
            <ReferenceArea key={i} x1={r.start} x2={r.end} fill="#f44336" fillOpacity={0.2} />
          ))}
          <ReferenceLine x={currentFrameIndex} stroke="#FFD700" strokeWidth={1.5} />
          {METRIC_DEFS.filter(({ key }) => enabled[key]).map(({ key, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
