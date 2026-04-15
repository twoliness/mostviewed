import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Weekly YouTube Charts | Most Viewed Today',
  description: 'Track weekly YouTube charts with top performing videos ranked by peak view counts over the past 7 days.',
};

export default function WeeklyChartsPage() {
  return (
    <LeaderboardPage
      heroTitle="Weekly YouTube charts"
      heroSubtitle="Top performing videos from the last 7 days"
      endpoint="/api/leaderboard/weekly-charts?limit=100"
      rankingTitle="Weekly leaderboard"
      footerContext="global"
    />
  );
}
