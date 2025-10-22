import { Telegraf } from 'telegraf';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Idl, BorshCoder } from '@coral-xyz/anchor';
import { ANALOS_RPC_URL, ANALOS_PROGRAMS, getAnalosExplorerUrl } from '../src/config/analos-programs';
import LAUNCHPAD_CORE_IDL from '../src/idl/analos_nft_launchpad_core.json';

// Env
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID as string; // Channel or group ID (e.g. -1001234567890)

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
  process.exit(1);
}

// Setup bot
const bot = new Telegraf(BOT_TOKEN);

// Solana connection (websocket subscriptions are derived automatically)
const connection = new Connection(ANALOS_RPC_URL, 'confirmed');

// Anchor coder for decoding logs and accounts
const provider = new AnchorProvider(connection as any, {} as any, {});
const program = new Program(LAUNCHPAD_CORE_IDL as Idl, ANALOS_PROGRAMS.NFT_LAUNCHPAD_CORE, provider);
const coder = new BorshCoder(program.idl);

// Types from IDL
type NftRecordAccount = {
  collectionConfig: PublicKey;
  nftMint: PublicKey;
  mintIndex: bigint;
  owner: PublicKey;
  rarityTier: number | null;
  rarityMultiplier: bigint | null;
  tokensClaimed: boolean;
  isStaked: boolean;
  isBurned: boolean;
  createdAt: bigint;
  burnedAt: bigint | null;
};

function short(pk: string, n = 4) {
  return `${pk.slice(0, n)}...${pk.slice(-n)}`;
}

async function sendMintMessage(opts: {
  collection: string;
  mint: string;
  owner: string;
  mintIndex: number;
  rarity?: string;
  multiplier?: string;
  image?: string;
  explorerUrl?: string;
  tokensClaimed?: boolean;
  isStaked?: boolean;
}) {
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
  if (opts.explorerUrl) lines.push(`• Explorer: <a href="${opts.explorerUrl}">view</a>`);

  const caption = lines.join('\n');

  if (opts.image) {
    await bot.telegram.sendPhoto(CHAT_ID, opts.image, { caption, parse_mode: 'HTML' });
  } else {
    await bot.telegram.sendMessage(CHAT_ID, caption, { parse_mode: 'HTML' });
  }
}

async function getCollectionName(collectionConfigPk: PublicKey): Promise<string> {
  try {
    const accountInfo = await connection.getAccountInfo(collectionConfigPk);
    if (!accountInfo) return short(collectionConfigPk.toBase58());
    const decoded = coder.accounts.decode('CollectionConfig', accountInfo.data);
    // Prefer collectionName if present
    if (decoded.collectionName) return decoded.collectionName as string;
    return short(collectionConfigPk.toBase58());
  } catch {
    return short(collectionConfigPk.toBase58());
  }
}

async function tryFetchImageFromMetadata(nftMintPk: PublicKey): Promise<string | undefined> {
  try {
    // Use metadata service to derive URI if available
    // fetchMetadataJSON expects a URI, but we need the URI first; in this codebase
    // token metadata PDA parsing is custom to Analos. As a heuristic, try explorer image endpoints later if needed.
    return undefined;
  } catch {
    return undefined;
  }
}

async function start() {
  console.log('Starting Analos NFT mint tracker bot...');

  // Subscribe to program account changes for NftRecord
  const programId = ANALOS_PROGRAMS.NFT_LAUNCHPAD_CORE;

  // Filter only newly created accounts by caching seen pubkeys
  const seen = new Set<string>();

  connection.onProgramAccountChange(programId, async (info) => {
    try {
      const { accountId, accountInfo } = info as any;
      if (!accountInfo?.data) return;
      const key = (accountId as PublicKey).toBase58?.() || String(accountId);
      if (seen.has(key)) return;

      // Try decoding as NftRecord; skip if not matching
      let decoded: any;
      try {
        decoded = coder.accounts.decode('NftRecord', accountInfo.data);
      } catch {
        return; // Not an NftRecord
      }

      seen.add(key);

      const nftRecord = decoded as NftRecordAccount;

      const collectionName = await getCollectionName(nftRecord.collectionConfig);

      const image = await tryFetchImageFromMetadata(nftRecord.nftMint);

      const rarity = nftRecord.rarityTier != null ? String(nftRecord.rarityTier) : undefined;
      const multiplier = nftRecord.rarityMultiplier != null ? String(nftRecord.rarityMultiplier) : undefined;

      await sendMintMessage({
        collection: collectionName,
        mint: nftRecord.nftMint.toBase58(),
        owner: nftRecord.owner.toBase58(),
        mintIndex: Number(nftRecord.mintIndex || 0n),
        rarity,
        multiplier,
        image,
        explorerUrl: getAnalosExplorerUrl(nftRecord.nftMint.toBase58()),
        tokensClaimed: !!nftRecord.tokensClaimed,
        isStaked: !!nftRecord.isStaked,
      });
    } catch (e) {
      console.error('Handler error:', e);
    }
  }, 'confirmed');

  console.log('Subscribed to program accounts for NFT_LAUNCHPAD_CORE');
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
