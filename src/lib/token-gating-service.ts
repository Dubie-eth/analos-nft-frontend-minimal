/**
 * Token Gating Service
 * Checks user token balances for whitelist eligibility and pricing discounts
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { ANALOS_RPC_URL } from '@/config/analos-programs';
import { tokenHolderCache } from './token-holder-cache';

// $LOL Token Configuration
const LOL_TOKEN_MINT = new PublicKey('ANAL2R8pvMvd4NLmesbJgFjNxbTC13RDwQPbwSBomrQ6'); // Official $LOL token mint
const WHITELIST_THRESHOLD = 1_000_000; // 1 million $LOL tokens for free mint
const DISCOUNT_THRESHOLD = 100_000; // 100k $LOL tokens for 50% discount

// REMOVED: Hardcoded whitelist - now using pure on-chain balance checks
// All tier eligibility is determined dynamically from actual token holdings

export interface TokenGatingResult {
  eligible: boolean;
  tokenBalance: number;
  discount: number; // 0-100 percentage
  reason: string;
  tier: 'free' | 'discounted' | 'full-price';
}

export class TokenGatingService {
  private connection: Connection;

  constructor(rpcUrl: string = ANALOS_RPC_URL) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    console.log('🪙 Token Gating Service initialized');
  }

  /**
   * Check if user is eligible for free/discounted mint based on $LOL token holdings
   */
  async checkEligibility(walletAddress: string): Promise<TokenGatingResult> {
    // PURE ON-CHAIN BALANCE CHECK - NO HARDCODED WALLETS
    console.log('🔍 Checking $LOL balance on-chain for:', walletAddress);
    
    try {
      const userPublicKey = new PublicKey(walletAddress);

      console.log('🔍 Checking $LOL token balance for:', walletAddress);
      console.log('🪙 $LOL Token Mint:', LOL_TOKEN_MINT.toString());

      // Get user's $LOL token account (TOKEN-2022 program!)
      const tokenAccount = await getAssociatedTokenAddress(
        LOL_TOKEN_MINT,
        userPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID  // $LOL uses Token-2022, not standard token!
      );

      console.log('📊 Associated Token Account:', tokenAccount.toString());
      console.log('🔗 Checking account on RPC:', this.connection.rpcEndpoint);

      // Get token balance with retry logic (RPC can be flaky)
      let accountInfo;
      let retries = 3;
      while (retries > 0) {
        try {
          accountInfo = await getAccount(
            this.connection,
            tokenAccount,
            'confirmed',
            TOKEN_2022_PROGRAM_ID  // $LOL uses Token-2022!
          );
          break; // Success, exit retry loop
        } catch (fetchError: any) {
          retries--;
          console.warn(`⚠️ Failed to fetch token account (${3 - retries}/3):`, fetchError.message);
          if (retries === 0) throw fetchError; // Give up after 3 tries
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }

      const balance = Number(accountInfo.amount);
      const decimals = accountInfo.mint.equals(LOL_TOKEN_MINT) ? 9 : 0; // $LOL has 9 decimals
      const actualBalance = balance / Math.pow(10, decimals);
      
      console.log('💰 $LOL Balance (raw):', balance.toLocaleString(), 'units');
      console.log('💰 $LOL Balance (actual):', actualBalance.toLocaleString(), '$LOL');
      console.log('🎯 Whitelist Threshold:', WHITELIST_THRESHOLD.toLocaleString(), '$LOL');
      console.log('🎯 Discount Threshold:', DISCOUNT_THRESHOLD.toLocaleString(), '$LOL');

      // Check eligibility based on ACTUAL balance (accounting for decimals)
      // $LOL has 9 decimals, so raw balance needs to be converted
      if (actualBalance >= WHITELIST_THRESHOLD) {
        console.log('✅ WHITELIST APPROVED: Balance', actualBalance.toLocaleString(), '>= Threshold', WHITELIST_THRESHOLD.toLocaleString());
        return {
          eligible: true,
          tokenBalance: actualBalance,
          discount: 100, // 100% discount = FREE
          reason: `🎉 You hold ${actualBalance.toLocaleString()} $LOL tokens! Free mint unlocked!`,
          tier: 'free'
        };
      } else if (actualBalance >= DISCOUNT_THRESHOLD) {
        console.log('✅ DISCOUNT APPROVED: Balance', actualBalance.toLocaleString(), '>= Threshold', DISCOUNT_THRESHOLD.toLocaleString());
        return {
          eligible: true,
          tokenBalance: actualBalance,
          discount: 50, // 50% discount
          reason: `✨ You hold ${actualBalance.toLocaleString()} $LOL tokens! 50% discount applied!`,
          tier: 'discounted'
        };
      } else {
        console.log('❌ NO DISCOUNT: Balance', actualBalance.toLocaleString(), '< Threshold', DISCOUNT_THRESHOLD.toLocaleString());
        return {
          eligible: false,
          tokenBalance: actualBalance,
          discount: 0,
          reason: actualBalance > 0 
            ? `You hold ${actualBalance.toLocaleString()} $LOL tokens. Need ${DISCOUNT_THRESHOLD.toLocaleString()} for discount or ${WHITELIST_THRESHOLD.toLocaleString()} for free mint.`
            : 'Hold $LOL tokens to unlock discounts!',
          tier: 'full-price'
        };
      }

    } catch (error: any) {
      console.error('⚠️ Error checking $LOL token balance via RPC:');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      
      // FALLBACK: Try token holder cache
      console.log('🔄 Falling back to token holder cache...');
      try {
        const cachedBalance = await tokenHolderCache.getHolderBalance(walletAddress);
        
        if (cachedBalance !== null) {
          console.log('✅ Found balance in cache:', cachedBalance.toLocaleString(), '$LOL');
          
          // Check eligibility based on cached balance
          if (cachedBalance >= WHITELIST_THRESHOLD) {
            return {
              eligible: true,
              tokenBalance: cachedBalance,
              discount: 100,
              reason: `🎉 You hold ${cachedBalance.toLocaleString()} $LOL tokens! Free mint unlocked!`,
              tier: 'free'
            };
          } else if (cachedBalance >= DISCOUNT_THRESHOLD) {
            return {
              eligible: true,
              tokenBalance: cachedBalance,
              discount: 50,
              reason: `✨ You hold ${cachedBalance.toLocaleString()} $LOL tokens! 50% discount applied!`,
              tier: 'discounted'
            };
          } else {
            return {
              eligible: false,
              tokenBalance: cachedBalance,
              discount: 0,
              reason: `You hold ${cachedBalance.toLocaleString()} $LOL tokens. Need ${DISCOUNT_THRESHOLD.toLocaleString()} for discount or ${WHITELIST_THRESHOLD.toLocaleString()} for free mint.`,
              tier: 'full-price'
            };
          }
        }
      } catch (cacheError) {
        console.error('❌ Cache lookup also failed:', cacheError);
      }
      
      // Both methods failed
      return {
        eligible: false,
        tokenBalance: 0,
        discount: 0,
        reason: 'Unable to verify $LOL token balance. Please try again.',
        tier: 'full-price'
      };
    }
  }

  /**
   * Calculate final price after applying token-based discounts
   */
  calculateFinalPrice(basePrice: number, discount: number): number {
    if (discount >= 100) return 0; // Free mint
    if (discount <= 0) return basePrice; // No discount
    
    return Math.floor(basePrice * (1 - discount / 100));
  }

  /**
   * Get pricing tiers based on username length
   */
  getBasePricing(usernameLength: number): { price: number; tier: string; currency: string } {
    if (usernameLength === 3) {
      return {
        price: 16035, // 15,000 * 1.069 (platform fee)
        tier: '3-digit',
        currency: 'LOS'
      };
    } else if (usernameLength === 4) {
      return {
        price: 6414, // 6,000 * 1.069
        tier: '4-digit',
        currency: 'LOS'
      };
    } else {
      return {
        price: 2673, // 2,500 * 1.069
        tier: '5-plus',
        currency: 'LOS'
      };
    }
  }

  /**
   * Get complete pricing with token discount applied
   */
  async getPricingWithDiscount(username: string, walletAddress: string): Promise<{
    basePrice: number;
    discount: number;
    finalPrice: number;
    tier: string;
    currency: string;
    tokenBalance: number;
    discountReason: string;
    isFree: boolean;
  }> {
    // Get base pricing
    const basePricing = this.getBasePricing(username.length);
    
    // Check token eligibility
    const eligibility = await this.checkEligibility(walletAddress);
    
    // Calculate final price
    const finalPrice = this.calculateFinalPrice(basePricing.price, eligibility.discount);
    
    return {
      basePrice: basePricing.price,
      discount: eligibility.discount,
      finalPrice: finalPrice,
      tier: basePricing.tier,
      currency: basePricing.currency,
      tokenBalance: eligibility.tokenBalance,
      discountReason: eligibility.reason,
      isFree: finalPrice === 0
    };
  }
}

// Export singleton instance
export const tokenGatingService = new TokenGatingService();

