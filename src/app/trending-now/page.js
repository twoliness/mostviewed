import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Trending Now | Most Viewed Today',
  description: 'See what is trending right now on YouTube with live-ranked, high-velocity video data.',
};

export default function TrendingNowPage() {
  return (
    <LeaderboardPage
      heroTitle="Trending now"
      heroSubtitle="Live-ranked YouTube videos with the strongest momentum"
      endpoint="/api/leaderboard/trending-now?limit=100"
      rankingTitle="Real-time trend ranking"
      footerContext="global"
    />
  );
}
