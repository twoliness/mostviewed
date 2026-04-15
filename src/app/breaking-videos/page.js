import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Breaking Viral Content | Most Viewed Today',
  description: 'Track breaking viral YouTube videos from very recent uploads that are already pulling high views.',
};

export default function BreakingVideosPage() {
  return (
    <LeaderboardPage
      heroTitle="Breaking viral content"
      heroSubtitle="Fresh uploads with high traction in the last 72 hours"
      endpoint="/api/leaderboard/breaking-videos?limit=100"
      rankingTitle="Breaking leaderboard"
      footerContext="global"
    />
  );
}
