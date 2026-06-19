'use client';

import Link from 'next/link';
import { Globe, ChevronDown } from 'lucide-react';
import { usePathname } from 'next/navigation';

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

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-[1240px] items-center px-6">
        <Link href="/" className="flex items-center gap-1.5 text-[15px] font-medium tracking-tight">
          <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-foreground text-[11px] font-semibold text-background">
            m
          </span>
          <span>mostviewed<span className="text-brand">.today</span></span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-hover-row">
            <Globe className="h-3.5 w-3.5" />
            {regionLabel}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/15 text-[11px] font-semibold text-brand">
            YT
          </div>
        </div>
      </div>
    </header>
  );
}
