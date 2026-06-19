export default function StatsBar({ stats = [] }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {s.label}
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[22px] font-semibold tracking-tight">{s.value}</span>
            {s.unit && (
              <span className="text-[11px] text-muted-foreground">{s.unit}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
