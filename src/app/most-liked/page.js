import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Most Liked Videos | Most Viewed Today',
  description: 'Discover the most liked YouTube videos today with engagement-focused ranking and view context.',
};

export default function MostLikedPage() {
  return (
    <LeaderboardPage
      heroTitle="Most liked videos"
      heroSubtitle="YouTube videos ranked by latest like counts"
      endpoint="/api/leaderboard/most-liked?limit=100"
      rankingTitle="Like leaderboard"
      footerContext="global"
      metricKey="like_count"
      metricLabel="likes"
      secondaryMetricKey="view_count"
      secondaryMetricLabel="views"
    />
  );
}
