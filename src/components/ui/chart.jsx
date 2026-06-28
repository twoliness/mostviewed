"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

const ChartContext = React.createContext(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer>");
  return ctx;
}

const ChartContainer = React.forwardRef(function ChartContainer(
  { id, className, children, config, ...props },
  ref
) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-layer]:outline-none",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-sector]:outline-none",
          "[&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});

const ChartStyle = ({ id, config }) => {
  const colorConfig = Object.entries(config || {}).filter(
    ([, c]) => c.color || c.theme
  );
  if (!colorConfig.length) return null;
  const css = colorConfig
    .map(([key, c]) => {
      const color = c.theme?.light || c.color;
      return color ? `  --color-${key}: ${color};` : null;
    })
    .filter(Boolean)
    .join("\n");
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `[data-chart=${id}] {\n${css}\n}`,
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef(function ChartTooltipContent(
  {
    active,
    payload,
    className,
    label,
    labelFormatter,
    formatter,
    hideLabel = false,
    hideIndicator = false,
    indicator = "dot",
    nameKey,
    labelKey,
  },
  ref
) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const labelNode = !hideLabel ? (
    <div className="font-medium text-foreground">
      {labelFormatter ? labelFormatter(label, payload) : label}
    </div>
  ) : null;

  return (
    <div
      ref={ref}
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      {labelNode}
      <div className="grid gap-1.5">
        {payload.map((item, idx) => {
          const key = nameKey || item.name || item.dataKey || "value";
          const itemConfig = config?.[key];
          const color = item.payload?.fill || item.color;
          return (
            <div
              key={item.dataKey ?? idx}
              className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
            >
              {!hideIndicator ? (
                <div
                  className={cn(
                    "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                    indicator === "dot" && "h-2.5 w-2.5",
                    indicator === "line" && "w-1"
                  )}
                  style={{
                    "--color-bg": color,
                    "--color-border": color,
                  }}
                />
              ) : null}
              <div className="flex flex-1 justify-between leading-none gap-2">
                <span className="text-muted-foreground">
                  {itemConfig?.label || item.name}
                </span>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {formatter
                    ? formatter(item.value, item.name, item, idx, item.payload)
                    : item.value?.toLocaleString?.() ?? item.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
};
