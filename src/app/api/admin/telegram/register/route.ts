import { NextRequest, NextResponse } from 'next/server';
import { ensureServiceKey, encryptSecret, getBaseUrl, telegramGetMe, telegramSetWebhook, upsertBot } from '@/lib/telegram-service';

export async function POST(request: NextRequest) {
  try {
    if (!ensureServiceKey(request as unknown as Request)) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slug, botToken, creatorWallet, groupId } = body || {};

    if (!slug || !botToken) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const me = await telegramGetMe(botToken);

    const secret = cryptoRandom();
    const { cipherTextB64, ivB64 } = encryptSecret(botToken);

    const base = getBaseUrl(request as unknown as Request);
    const webhookUrl = `${base}/api/tg/${encodeURIComponent(slug)}`;

    await telegramSetWebhook(botToken, webhookUrl, secret);

    const record = await upsertBot({
      id: undefined,
      slug,
      creator_wallet: creatorWallet || null,
      bot_id: String(me.id),
      bot_username: me.username,
      bot_name: me.first_name || me.name || me.username,
      encrypted_token: cipherTextB64,
      token_iv: ivB64,
      webhook_secret: secret,
      webhook_url: webhookUrl,
      group_id: groupId || null,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, bot: { slug: record.slug, username: record.bot_username, webhook: record.webhook_url } });
  } catch (error: any) {
    console.error('Telegram register error:', error);
    return NextResponse.json({ ok: false, error: 'internal_error', details: String(error?.message || error) }, { status: 500 });
  }
}

function cryptoRandom(len: number = 32): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const dynamic = 'force-dynamic';
