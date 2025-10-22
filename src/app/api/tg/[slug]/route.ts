import { NextRequest, NextResponse } from 'next/server';
import {
  TelegramUpdate,
  getBotBySlug,
  isValidTelegramWebhook,
  decryptSecret,
  telegramSendMessage,
  parseCommand,
  recordBotUserInteraction
} from '@/lib/telegram-service';

export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug;
    const bot = await getBotBySlug(slug);
    if (!bot || bot.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'bot_not_found' }, { status: 404 });
    }

    if (!isValidTelegramWebhook(request as unknown as Request, bot.webhook_secret)) {
      return NextResponse.json({ ok: false, error: 'invalid_webhook_secret' }, { status: 403 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;
    if (!message) return NextResponse.json({ ok: true });

    await recordBotUserInteraction(slug, message.from, message.chat);

    const token = decryptSecret(bot.encrypted_token, bot.token_iv);

    const command = parseCommand(message.text);
    if (command) {
      switch (command.cmd) {
        case 'start':
          await telegramSendMessage(token, message.chat.id, 'Welcome! Use /verify to link your wallet.');
          break;
        case 'help':
          await telegramSendMessage(token, message.chat.id, 'Commands: /start, /help, /verify');
          break;
        case 'verify':
          await telegramSendMessage(token, message.chat.id, 'Please open the app and connect your wallet to complete verification.');
          break;
        default:
          await telegramSendMessage(token, message.chat.id, `Unknown command: ${command.cmd}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
