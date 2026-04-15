import Link from 'next/link';

const CATEGORY_LINKS = [
  { href: '/category/music', label: '♫ Music Videos & Charts' },
  { href: '/category/gaming', label: '🎮 Gaming & Esports' },
  { href: '/category/entertainment', label: '🃏 Entertainment & Celebrity' },
  { href: '/category/sports', label: '⚽ Sports & Fitness' },
  { href: '/category/comedy', label: '😂 Comedy & Memes' },
  { href: '/category/news-politics', label: '📰 News & Politics' },
  { href: '/category/science-technology', label: '🔬 Tech & Science' },
  { href: '/category/howto-style', label: '💄 Beauty & Lifestyle' },
  { href: '/category/education', label: '📚 Educational Content' },
  { href: '/category/film-animation', label: '🎬 Movies & Animation' },
];

const CONTENT_LINKS = [
  { href: '/shorts', label: 'YouTube Shorts Rankings' },
  { href: '/viral-videos', label: 'Viral Videos Today' },
  { href: '/most-liked', label: 'Most Liked Videos' },
  { href: '/trending-now', label: 'Trending Now' },
  { href: '/top-creators', label: 'Top YouTube Creators' },
  { href: '/breaking-videos', label: 'Breaking Viral Content' },
  { href: '/weekly-charts', label: 'Weekly YouTube Charts' },
  { href: '/monthly-top', label: 'Monthly Top Videos' },
];

const GLOBAL_LINKS = [
  { href: '/trending/usa', label: '🇺🇸 USA Trending Videos' },
  { href: '/trending/uk', label: '🇬🇧 UK Trending Videos' },
  { href: '/trending/india', label: '🇮🇳 India Trending Videos' },
  { href: '/trending/canada', label: '🇨🇦 Canada Trending Videos' },
  { href: '/trending/australia', label: '🇦🇺 Australia Trending' },
  { href: '/trending/germany', label: '🇩🇪 Germany Trending' },
  { href: '/trending/brazil', label: '🇧🇷 Brazil Trending Videos' },
  { href: '/global', label: '🌎 Global YouTube Trends' },
];

const METRICS = [
  '10M+ videos tracked',
  '30-min data refresh',
  'Global trend coverage',
];

function FooterLink({ href, label }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center text-sm leading-6 text-slate-600 transition hover:text-slate-900"
    >
      <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
    </Link>
  );
}

export default function SeoFooter({ context = 'global' }) {
  const year = new Date().getFullYear();

  const contextHeadline =
    context === 'category'
      ? 'Category Trends'
      : context === 'country'
        ? 'Country Trends'
        : context === 'shorts'
          ? 'Shorts Trends'
          : 'Global Trends';

  return (
    <footer className="mt-10 border-t border-slate-200 bg-slate-100">
      <div className="py-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_1fr_1fr_1fr]">
          <section>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">MostViewedToday</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Find What&apos;s Viral First</h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-slate-600">
              Track YouTube&apos;s most viewed videos with live-ranked leaderboards across categories, creators,
              countries, and Shorts.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {METRICS.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-300 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Trending Video Categories</h3>
            <div className="mt-3 grid gap-1.5">
              {CATEGORY_LINKS.map((item) => (
                <FooterLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">Content & Rankings</h3>
            <div className="mt-3 grid gap-1.5">
              {CONTENT_LINKS.map((item) => (
                <FooterLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-900">{contextHeadline}</h3>
            <div className="mt-3 grid gap-1.5">
              {GLOBAL_LINKS.map((item) => (
                <FooterLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-7 border-t border-slate-200 pt-4 text-xs text-slate-500">
          © {year} mostviewed.today • YouTube trend tracking and leaderboard analytics
        </div>
      </div>
    </footer>
  );
}
