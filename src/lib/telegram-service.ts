import crypto from 'crypto';
import { getSupabaseAdmin } from './supabase/client';

// Types for Telegram API payloads (minimal subset)
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramBotRecord {
  id: string; // uuid
  slug: string; // human-readable identifier, usually bot username
  creator_wallet: string | null;
  bot_id: string; // numeric id from getMe
  bot_username: string; // from getMe
  bot_name: string | null; // from getMe
  encrypted_token: string; // AES-GCM encrypted token
  token_iv: string; // base64 iv used for encryption
  webhook_secret: string; // random secret to verify webhook
  webhook_url: string; // computed from PUBLIC_BASE_URL
  group_id: string | null; // optional default group/channel id
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Environment helpers
export function getBaseUrl(request?: Request): string {
  const envBase = process.env.PUBLIC_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, '');
  // Fallback to request host if provided
  if (request) {
    try {
      const url = new URL(request.url);
      const proto = url.protocol || 'https:';
      const host = url.host;
      return `${proto}//${host}`;
    } catch (_) {
      // ignore
    }
  }
  // Last resort
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Encryption utilities (AES-256-GCM)
const ENC_KEY_RAW = (process.env.ENCRYPTION_SECRET || process.env.DATABASE_ENCRYPTION_KEY || '').padEnd(32, '0').slice(0, 32);
const ENC_KEY = Buffer.from(ENC_KEY_RAW, 'utf8');

export function encryptSecret(plaintext: string): { cipherTextB64: string; ivB64: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([enc, tag]).toString('base64');
  return { cipherTextB64: payload, ivB64: iv.toString('base64') };
}

export function decryptSecret(cipherTextB64: string, ivB64: string): string {
  const buf = Buffer.from(cipherTextB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

// Telegram API helpers
export async function telegramGetMe(botToken: string): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const json = await res.json();
  if (!json.ok) throw new Error(`getMe failed: ${JSON.stringify(json)}`);
  return json.result;
}

export async function telegramSetWebhook(botToken: string, url: string, secretToken: string): Promise<any> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secretToken,
      drop_pending_updates: true,
      allowed_updates: ['message']
    })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`setWebhook failed: ${JSON.stringify(json)}`);
  return json.result;
}

export async function telegramSendMessage(botToken: string, chatId: number | string, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true })
  });
}

// Database accessors
export async function getBotBySlug(slug: string): Promise<TelegramBotRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('telegram_bots')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TelegramBotRecord) || null;
}

export async function upsertBot(record: Omit<TelegramBotRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<TelegramBotRecord> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('telegram_bots')
    .upsert(record as any, { onConflict: 'slug' })
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as TelegramBotRecord;
}

export async function recordBotUserInteraction(botSlug: string, user: TelegramUser | undefined, chat: TelegramChat): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from('telegram_bot_users').insert({
    bot_slug: botSlug,
    user_id: String(user?.id || ''),
    username: user?.username || null,
    first_name: user?.first_name || null,
    last_name: user?.last_name || null,
    chat_id: String(chat.id),
    chat_type: chat.type,
  }).select('*').limit(1);
}

export function isValidTelegramWebhook(request: Request, expectedSecret: string): boolean {
  const header = request.headers.get('x-telegram-bot-api-secret-token');
  return Boolean(header && expectedSecret && header === expectedSecret);
}

export function parseCommand(text?: string): { cmd: string; args: string } | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const [head, ...rest] = trimmed.split(/\s+/);
  const cmd = head.replace(/^\//, '').toLowerCase().split('@')[0];
  return { cmd, args: rest.join(' ') };
}

export function ensureServiceKey(request: Request): boolean {
  const provided = request.headers.get('x-service-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const expected = process.env.SERVICE_ADMIN_KEY || '';
  return Boolean(expected && provided && provided === expected);
}
