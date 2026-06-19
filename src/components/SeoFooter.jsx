import Link from 'next/link';

const CATEGORY_LINKS = [
  { href: '/category/music', label: '🎵 Music Videos & Charts' },
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
  { href: '/global', label: '🌍 Global YouTube Trends' },
];

const METRICS = ['10M+ videos tracked', '30-min data refresh', 'Global trend coverage'];

function FooterCol({ title, items }) {
  return (
    <div>
      <h4 className="mb-2 text-[12px] font-semibold tracking-tight">{title}</h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-[12px] leading-5 text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SeoFooter({ context = 'global' }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-[1240px] px-6 py-8">
        <div className="flex flex-col gap-8 md:flex-row md:gap-16">
          <div className="md:w-[200px] md:shrink-0">
            <div className="mb-2 flex items-center gap-1.5 text-[14px] font-medium tracking-tight">
              <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-foreground text-[11px] font-semibold text-background">
                m
              </span>
              <span>mostviewed<span className="text-brand">.today</span></span>
            </div>
            <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
              Track YouTube&apos;s most viewed videos with live-ranked leaderboards across
              categories, creators, countries, and Shorts.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-3">
            <FooterCol title="Trending Video Categories" items={CATEGORY_LINKS} />
            <FooterCol title="Content & Rankings" items={CONTENT_LINKS} />
            <FooterCol title="Global Trends" items={GLOBAL_LINKS} />
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-6 py-3 text-[11px] text-muted-foreground">
          <span>© 2025 mostviewed.today · YouTube trend tracking and leaderboard analytics</span>
          <span className="hidden sm:block">Updated every 30 min</span>
        </div>
      </div>
    </footer>
  );
}
