import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import { BorshCoder, Idl } from '@coral-xyz/anchor';
import idl from './idl/analos_nft_launchpad_core.json';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const ANALOS_RPC_URL = process.env.ANALOS_RPC_URL || 'https://rpc.analos.io';
const NFT_LAUNCHPAD_CORE = process.env.NFT_LAUNCHPAD_CORE || 'H423wLPdU2ut7JBJmq7Y9V6whXVTtHyRY3wvqypwfgfm';
const COMMITMENT: Commitment = 'confirmed';

if (!BOT_TOKEN || !CHAT_ID) {
  // eslint-disable-next-line no-console
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const connection = new Connection(ANALOS_RPC_URL, COMMITMENT);
const coder = new BorshCoder(idl as unknown as Idl);

function explorerUrl(address: string): string {
  return `https://explorer.analos.io/address/${address}`;
}

function short(pk: string, n = 4): string {
  return `${pk.slice(0, n)}...${pk.slice(-n)}`;
}

async function sendMintMessage(opts: {
  collection: string;
  mint: string;
  owner: string;
  mintIndex: number;
  rarity?: string;
  multiplier?: string;
  tokensClaimed?: boolean;
  isStaked?: boolean;
  image?: string;
}): Promise<void> {
  const lines: string[] = [];
  lines.push('🔥 New NFT Mint on Analos');
  lines.push(`• Collection: <code>${opts.collection}</code>`);
  lines.push(`• Mint: <code>${opts.mint}</code>`);
  lines.push(`• Owner: <code>${opts.owner}</code>`);
  lines.push(`• Index: <b>#${opts.mintIndex}</b>`);
  if (opts.rarity) lines.push(`• Rarity: <b>${opts.rarity}</b>`);
  if (opts.multiplier) lines.push(`• Multiplier: <b>${opts.multiplier}x</b>`);
  if (typeof opts.tokensClaimed === 'boolean') lines.push(`• Tokens Claimed: <b>${opts.tokensClaimed ? 'Yes' : 'No'}</b>`);
  if (typeof opts.isStaked === 'boolean') lines.push(`• Staked: <b>${opts.isStaked ? 'Yes' : 'No'}</b>`);
  lines.push(`• Explorer: <a href="${explorerUrl(opts.mint)}">view</a>`);

  const caption = lines.join('\n');

  if (opts.image) {
    await bot.telegram.sendPhoto(CHAT_ID, opts.image, { caption, parse_mode: 'HTML' });
  } else {
    await bot.telegram.sendMessage(CHAT_ID, caption, { parse_mode: 'HTML' });
  }
}

async function getCollectionName(collectionConfigPk: PublicKey): Promise<string> {
  try {
    const acc = await connection.getAccountInfo(collectionConfigPk, COMMITMENT);
    if (!acc) return short(collectionConfigPk.toBase58());
    const decoded: any = coder.accounts.decode('CollectionConfig', acc.data);
    if (decoded?.collectionName) return String(decoded.collectionName);
    return short(collectionConfigPk.toBase58());
  } catch {
    return short(collectionConfigPk.toBase58());
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Starting Analos Telegram mint tracker...');
  // eslint-disable-next-line no-console
  console.log('RPC:', ANALOS_RPC_URL);

  const programId = new PublicKey(NFT_LAUNCHPAD_CORE);
  const seen = new Set<string>();

  connection.onProgramAccountChange(
    programId,
    async (info) => {
      try {
        const { accountId, accountInfo } = info as any;
        if (!accountInfo?.data) return;
        const key = (accountId as PublicKey).toBase58?.() || String(accountId);
        if (seen.has(key)) return;

        let decoded: any;
        try {
          decoded = coder.accounts.decode('NftRecord', accountInfo.data);
        } catch {
          return; // not an NftRecord account
        }
        seen.add(key);

        const nftRecord = decoded as any;
        const collectionName = await getCollectionName(nftRecord.collectionConfig);

        await sendMintMessage({
          collection: collectionName,
          mint: nftRecord.nftMint.toBase58(),
          owner: nftRecord.owner.toBase58(),
          mintIndex: Number(nftRecord.mintIndex || 0n),
          rarity: nftRecord.rarityTier != null ? String(nftRecord.rarityTier) : undefined,
          multiplier: nftRecord.rarityMultiplier != null ? String(nftRecord.rarityMultiplier) : undefined,
          tokensClaimed: !!nftRecord.tokensClaimed,
          isStaked: !!nftRecord.isStaked,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Handler error:', e);
      }
    },
    COMMITMENT,
  );

  // eslint-disable-next-line no-console
  console.log('Subscribed to program accounts for NFT_LAUNCHPAD_CORE');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
