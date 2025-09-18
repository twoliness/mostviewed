'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { POPULAR_CATEGORIES_DISPLAY } from '@/lib/types';
import { getCategoryIcon } from '@/lib/utils';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">📺</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                VidTrends
              </span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/shorts"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/shorts') 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400'
              }`}
            >
              📱 Trending Shorts
            </Link>
            
            <div className="relative group">
              <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                📂 Categories
              </button>
              
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20">
                <div className="grid grid-cols-2 gap-1 p-2 max-h-96 overflow-y-auto">
                  {POPULAR_CATEGORIES_DISPLAY.slice(0, 12).map((category) => (
                    <Link
                      key={category.slug}
                      href={`/category/${category.slug}`}
                      className={`px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        isActive(`/category/${category.slug}`)
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {getCategoryIcon(category.id)} {category.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button className="text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}