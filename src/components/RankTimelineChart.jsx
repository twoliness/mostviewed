"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const FULL_DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

// Free preview window — full history is gated behind a future paywall.
const PREVIEW_DAYS = 7;

function toMs(iso) {
  if (!iso) return null;
  const t = Date.parse(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isFinite(t) ? t : null;
}

// Bucket captures into one row per UTC day, keeping the best (lowest) rank
// per series. Sub-day cadence (we capture every 30min) would otherwise crowd
// the X-axis with repeated date labels.
function bucketByDay(series, key, map) {
  for (const r of series || []) {
    const t = toMs(r.captured_at);
    if (t == null) continue;
    const dayMs = Math.floor(t / 86400000) * 86400000;
    const row = map.get(dayMs) || { t: dayMs };
    if (row[key] == null || r.rank < row[key]) row[key] = r.rank;
    map.set(dayMs, row);
  }
}

function mergeSeries(globalSeries, categorySeries) {
  const map = new Map();
  bucketByDay(globalSeries, "global", map);
  bucketByDay(categorySeries, "category", map);
  return [...map.values()].sort((a, b) => a.t - b.t);
}

export default function RankTimelineChart({
  globalSeries = [],
  categorySeries = [],
  categoryLabel = "Category",
}) {
  const data = React.useMemo(() => {
    const merged = mergeSeries(globalSeries, categorySeries);
    if (!merged.length) return merged;
    // Free preview = last PREVIEW_DAYS days, anchored to the most recent
    // captured point. Earlier history will live behind a future paywall.
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const cutoff = merged[merged.length - 1].t - PREVIEW_DAYS * ONE_DAY;
    return merged.filter((d) => d.t >= cutoff);
  }, [globalSeries, categorySeries]);

  const hasGlobal = data.some((d) => d.global != null);
  const hasCategory = data.some((d) => d.category != null);

  // Always show dates on the X-axis — no clock times. Capture cadence is
  // sub-hourly, so multiple points share a day; minTickGap dedupes labels.
  const xTickFormatter = (v) => DAY_FMT.format(new Date(v));

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
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
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
              labelFormatter={(v) => FULL_DAY_FMT.format(new Date(v))}
              formatter={(value) => (value == null ? "—" : `#${value}`)}
              indicator="dot"
            />
          }
        />
        {hasCategory ? (
          <Line
            dataKey="category"
            type="monotone"
            stroke="var(--color-category)"
            strokeWidth={2}
            fill="none"
            connectNulls
            isAnimationActive={false}
            dot={{ r: 2.5, strokeWidth: 0 }}
            activeDot={{ r: 3 }}
          />
        ) : null}
        {hasGlobal ? (
          <Line
            dataKey="global"
            type="monotone"
            stroke="var(--color-global)"
            strokeWidth={2.5}
            fill="none"
            connectNulls
            isAnimationActive={false}
            dot={{ r: 2.5, strokeWidth: 0 }}
            activeDot={{ r: 3.5 }}
          />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}
