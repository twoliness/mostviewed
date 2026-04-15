export default function StatsBar({ stats = [] }) {
  return (
    <section className="border-b border-slate-200 bg-slate-200/80">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-px sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white px-4 py-3 sm:px-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{stat.label}</p>
            <p className="mt-0.5 text-2xl font-medium text-slate-900">
              {stat.value}
              {stat.unit && <span className="ml-1 text-xs font-normal text-slate-500">{stat.unit}</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
