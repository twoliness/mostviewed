export default function ChartHero({ title, subtitle }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-6 lg:px-8">
        <h1 className="text-[22px] font-medium tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
    </section>
  );
}
