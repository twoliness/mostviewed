'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { POPULAR_CATEGORIES_DISPLAY, SUPPORTED_COUNTRIES } from '@/lib/types';

const DISCOVER_LINKS = [
  { href: '/', label: 'Global trending' },
  { href: '/shorts', label: 'Global shorts' },
  { href: '/trending-now', label: 'Trending now' },
  { href: '/top-creators', label: 'Top creators' },
];

const DERIVED_LINKS = [
  { href: '/viral-videos', label: 'Viral videos' },
  { href: '/most-liked', label: 'Most liked' },
  { href: '/breaking-videos', label: 'Breaking videos' },
  { href: '/weekly-charts', label: 'Weekly charts' },
  { href: '/monthly-top', label: 'Monthly top' },
];

function getRegionLabel(pathname) {
  if (!pathname || pathname === '/') return 'Global';
  const path = pathname.toLowerCase();
  if (path.startsWith('/trending/')) {
    const country = path.replace('/trending/', '').split('/')[0];
    return country ? country.toUpperCase() : 'Region';
  }
  if (path.startsWith('/category/')) return 'Category';
  if (path === '/shorts') return 'Shorts';
  return 'Global';
}

export default function Navigation() {
  const pathname = usePathname();
  const regionLabel = getRegionLabel(pathname);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-[1240px] items-center px-6">
        <Link href="/" className="flex items-center gap-1.5 text-[15px] font-medium tracking-tight">
          <img src="/mvt-icon.png" alt="" className="h-5 w-5 rounded-[5px] object-contain" />
          <span>mostviewed<span className="text-brand">.today</span></span>
        </Link>

        <div className="ml-auto flex items-center gap-2" ref={wrapperRef}>
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-hover-row"
            >
              <Globe className="h-3.5 w-3.5" />
              {regionLabel}
              <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open ? (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+6px)] z-40 w-[min(560px,calc(100vw-32px))] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              >
                <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
                  <NavSection title="Region">
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <NavItem key={c.code} href={`/trending/${c.slug}`}>
                        <span className="mr-1.5">{c.flag}</span>{c.name}
                      </NavItem>
                    ))}
                  </NavSection>

                  <NavSection title="Category">
                    {POPULAR_CATEGORIES_DISPLAY.map((cat) => (
                      <NavItem key={cat.id} href={`/category/${cat.slug}`}>{cat.name}</NavItem>
                    ))}
                  </NavSection>

                  <NavSection title="Discover">
                    {DISCOVER_LINKS.map((l) => (
                      <NavItem key={l.href} href={l.href}>{l.label}</NavItem>
                    ))}
                    <div className="my-1 border-t border-border" />
                    {DERIVED_LINKS.map((l) => (
                      <NavItem key={l.href} href={l.href}>{l.label}</NavItem>
                    ))}
                  </NavSection>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavSection({ title, children }) {
  return (
    <div className="bg-card p-3">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavItem({ href, children }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-md px-2 py-1 text-[12px] text-foreground/80 transition-colors hover:bg-hover-row hover:text-foreground"
      >
        {children}
      </Link>
    </li>
  );
}
