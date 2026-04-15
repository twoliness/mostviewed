import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Global YouTube Trends | Most Viewed Today',
  description: 'Explore the global YouTube trending leaderboard with the most viewed videos worldwide, updated frequently.',
};

export default function GlobalPage() {
  return (
    <LeaderboardPage
      heroTitle="Global YouTube trends"
      heroSubtitle="Most viewed videos worldwide"
      endpoint="/api/leaderboard/global?limit=100"
      rankingTitle="Global leaderboard"
      footerContext="global"
    />
  );
}
