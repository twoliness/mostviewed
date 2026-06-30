import { getCloudflareContext } from '@opennextjs/cloudflare';
import { generateAndSendSocialPosts } from '@/lib/social-generator';

export async function POST() {
  try {
    const { env } = await getCloudflareContext({ async: true });

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
      return Response.json({ error: 'Telegram env vars not configured' }, { status: 500 });
    }

    const results = await generateAndSendSocialPosts({
      db: env.DB,
      anthropicKey: process.env.ANTHROPIC_API_KEY,
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      telegramChatId: process.env.TELEGRAM_CHAT_ID,
    });

    return Response.json({ success: true, results });
  } catch (err) {
    console.error('[social/post] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
