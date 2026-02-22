"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type Point = { date: string; recommended: number; applied: number | null };

export const PriceHistorySparkline = ({ points }: { points: Point[] }) => {
  if (points.length < 2) return null;

  // Recharts needs chronological order
  const sorted = [...points].reverse();

  return (
    <div className="h-[64px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sorted} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <Tooltip
            formatter={(value: number) => [`$${value.toLocaleString()}`, "Recommended"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #dbe3ef", fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="recommended"
            stroke="#2563eb"
            fill="url(#priceFill)"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
