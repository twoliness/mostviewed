import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Most Viewed Today - YouTube Trending Videos Leaderboard | Most Viewed Videos Today",
  description: "Track the most popular YouTube videos across all categories. Updated every 30 minutes with global trends, category leaderboards, and trending Shorts. See what's viral right now.",
  keywords: "YouTube trending, most viewed videos, viral videos, YouTube leaderboard, trending shorts, popular creators, video rankings, YouTube charts, trending now, most popular videos today",
  metadataBase: new URL('https://mostviewed.today'),
  openGraph: {
    title: "Most Viewed Today - YouTube Trending Videos Leaderboard",
    description: "Track the most popular YouTube videos across all categories. See global rankings, trending shorts, and top creators updated every 30 minutes.",
    url: 'https://mostviewed.today',
    siteName: 'Most Viewed Today',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Most Viewed Today - YouTube Trending Videos Leaderboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Most Viewed Today - YouTube Trending Videos Leaderboard",
    description: "Track the most popular YouTube videos across all categories. Updated every 30 minutes.",
    images: ['/og-image.png'],
    creator: '@Most Viewed Today',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Most Viewed Today',
    description: 'Track the most popular YouTube videos across all categories with real-time leaderboards',
    url: 'https://mostviewed.today',
    publisher: {
      '@type': 'Organization',
      name: 'Most Viewed Today',
      url: 'https://mostviewed.today',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://mostviewed.today/category/{search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    sameAs: [
      'https://twitter.com/Most Viewed Today',
    ],
  };

  return (
    <html lang="en">
      <head>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        {/* Additional SEO Meta Tags */}
        <meta name="author" content="Most Viewed Today" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://mostviewed.today" />
        
        {/* Favicon and Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#f97316" />
        <meta name="msapplication-TileColor" content="#f97316" />
        
        {/* DNS Prefetch for Performance */}
        <link rel="dns-prefetch" href="//www.youtube.com" />
        <link rel="dns-prefetch" href="//i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube.com" crossOrigin="" />
        
        {/* 100% privacy-first analytics */}
        <script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
        <noscript><img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" referrerpolicy="no-referrer-when-downgrade"/></noscript>
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 min-h-screen`}
      >
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
