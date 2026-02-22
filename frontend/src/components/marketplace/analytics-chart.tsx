"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const series = [
  { month: "Jan", revenue: 24000 },
  { month: "Feb", revenue: 36000 },
  { month: "Mar", revenue: 52000 },
  { month: "Apr", revenue: 60000 },
  { month: "May", revenue: 78000 },
  { month: "Jun", revenue: 98400 },
  { month: "Jul", revenue: 112300 },
  { month: "Aug", revenue: 125000 },
  { month: "Sep", revenue: 138000 },
  { month: "Oct", revenue: 142000 },
  { month: "Nov", revenue: 156000 },
  { month: "Dec", revenue: 165000 }
];

export const AnalyticsChart = () => (
  <div className="h-[320px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.26} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e7ecf4" strokeDasharray="3 3" />
        <XAxis dataKey="month" stroke="#6b7b93" tickLine={false} axisLine={false} />
        <YAxis stroke="#6b7b93" tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
          contentStyle={{ borderRadius: 10, border: "1px solid #dbe3ef" }}
        />
        <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="url(#revenueFill)" strokeWidth={2.5} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);
