import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Monthly Top Videos | Most Viewed Today',
  description: 'Explore monthly top YouTube videos ranked by peak performance over the last 30 days.',
};

export default function MonthlyTopPage() {
  return (
    <LeaderboardPage
      heroTitle="Monthly top videos"
      heroSubtitle="Top ranked YouTube videos from the last 30 days"
      endpoint="/api/leaderboard/monthly-top?limit=100"
      rankingTitle="Monthly leaderboard"
      footerContext="global"
    />
  );
}
