import LeaderboardPage from '@/components/LeaderboardPage';

export const metadata = {
  title: 'Viral Videos Today | Most Viewed Today',
  description: 'Discover the most viral YouTube videos today based on rapid high-view performance from newly published content.',
};

export default function ViralVideosPage() {
  return (
    <LeaderboardPage
      heroTitle="Viral videos today"
      heroSubtitle="Recently published videos with standout view velocity"
      endpoint="/api/leaderboard/viral-videos?limit=100"
      rankingTitle="Viral ranking"
      footerContext="global"
    />
  );
}
