"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatClock(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return m === 0 ? `${h}${ampm}` : `${h}:${String(m).padStart(2, "0")}${ampm}`;
}

const formatDayTime = (date) => `${DAY_FMT.format(date)} ${formatClock(date)}`;
const formatFull = (date) =>
  `${DAY_FMT.format(date)}, ${date.getFullYear()} ${formatClock(date)}`;

function toMs(iso) {
  if (!iso) return null;
  const t = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isFinite(t) ? t : null;
}

// Merge two series (global + category) keyed by captured_at timestamp.
function mergeSeries(globalSeries, categorySeries) {
  const map = new Map();
  for (const r of globalSeries || []) {
    const t = toMs(r.captured_at);
    if (t == null) continue;
    const row = map.get(t) || { t };
    row.global = r.rank;
    map.set(t, row);
  }
  for (const r of categorySeries || []) {
    const t = toMs(r.captured_at);
    if (t == null) continue;
    const row = map.get(t) || { t };
    row.category = r.rank;
    map.set(t, row);
  }
  return [...map.values()].sort((a, b) => a.t - b.t);
}

export default function RankTimelineChart({
  globalSeries = [],
  categorySeries = [],
  categoryLabel = "Category",
}) {
  const data = React.useMemo(
    () => mergeSeries(globalSeries, categorySeries),
    [globalSeries, categorySeries]
  );

  const hasGlobal = data.some((d) => d.global != null);
  const hasCategory = data.some((d) => d.category != null);

  // Pick X tick + tooltip formatters based on the visible time span.
  const spanMs = data.length > 1 ? data[data.length - 1].t - data[0].t : 0;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const xTickFormatter = spanMs < ONE_DAY
    ? (v) => formatClock(new Date(v))
    : spanMs < 3 * ONE_DAY
      ? (v) => formatDayTime(new Date(v))
      : (v) => DAY_FMT.format(new Date(v));

  // Baseline for the area fill — without this, recharts fills from value=0
  // which (with reversed Y) is at the top, drawing the area upward.
  const allRanks = data.flatMap((d) => [d.global, d.category]).filter((r) => r != null);
  const maxRank = allRanks.length ? Math.max(...allRanks) : 10;
  const baseValue = maxRank + 1;
  // Force integer ticks including #1; recharts otherwise auto-picks and may
  // drop the top of the domain.
  const yTicks = Array.from({ length: baseValue }, (_, i) => i + 1);

  const config = React.useMemo(
    () => ({
      global: { label: "Global", color: "var(--chart-1)" },
      category: { label: categoryLabel, color: "var(--chart-2)" },
    }),
    [categoryLabel]
  );

  if (!data.length) return null;

  return (
    <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={xTickFormatter}
        />
        <YAxis
          reversed
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          width={28}
          tickMargin={4}
          domain={[1, baseValue]}
          ticks={yTicks}
          interval={0}
          tickFormatter={(v) => `#${v}`}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => formatFull(new Date(v))}
              formatter={(value) => (value == null ? "—" : `#${value}`)}
              indicator="dot"
            />
          }
        />
        {hasCategory ? (
          <Area
            dataKey="category"
            type="monotone"
            stroke="var(--color-category)"
            strokeWidth={2}
            fill="none"
            connectNulls
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ) : null}
        {hasGlobal ? (
          <Area
            dataKey="global"
            type="monotone"
            stroke="var(--color-global)"
            strokeWidth={2.5}
            fill="none"
            connectNulls
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3.5 }}
          />
        ) : null}
      </AreaChart>
    </ChartContainer>
  );
}
