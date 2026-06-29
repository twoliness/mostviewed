export default function ChartHero({ title, subtitle }) {
  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-10 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[34px]">
            <span className="text-[22px] sm:text-[28px]">📊</span> {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          Updates every 30 min
        </span>
      </div>
    </div>
  );
}
