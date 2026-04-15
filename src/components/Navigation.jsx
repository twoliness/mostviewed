'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';
import { usePathname } from 'next/navigation';

function getRegionLabel(pathname) {
  if (!pathname || pathname === '/') return 'Global';

  const path = pathname.toLowerCase();

  if (path.startsWith('/trending/')) {
    const country = path.replace('/trending/', '').split('/')[0];
    return country ? country.toUpperCase() : 'Region';
  }

  if (path.startsWith('/category/')) {
    return 'Category';
  }

  if (path === '/shorts') {
    return 'Shorts';
  }

  return 'Global';
}

export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[52px] w-full max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-md font-semibold tracking-tight text-slate-900">
          most<span className="text-red-600">viewed</span>.today
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
            Updates every 30 min
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <Globe className="h-3.5 w-3.5" />
            {getRegionLabel(pathname)}
          </Link>
        </div>
      </div>
    </header>
  );
}
