import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "VidTrends - YouTube Trending Videos Leaderboard",
  description: "Track the most popular YouTube videos across all categories. Updated every 30 minutes with global trends, category leaderboards, and trending Shorts.",
  keywords: "YouTube, trending, videos, leaderboard, popular, viral, charts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
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
