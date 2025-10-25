'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Link from 'next/link';

export default function LosBrosCollectionPage() {
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [mintedNFTs, setMintedNFTs] = useState<any[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(true);
  const [pricing, setPricing] = useState<any>(null);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [showReveal, setShowReveal] = useState(false);
  const [mintedNFT, setMintedNFT] = useState<any>(null);

  // Fetch recently minted NFTs
  useEffect(() => {
    fetchMintedNFTs();
    const interval = setInterval(fetchMintedNFTs, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, []);

  // Fetch pricing when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchPricing();
    }
  }, [connected, publicKey]);

  // Fetch allocations
  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchMintedNFTs = async () => {
    try {
      const response = await fetch('/api/los-bros/recently-minted');
      const data = await response.json();
      if (data.success) {
        setMintedNFTs(data.nfts || []);
      }
    } catch (error) {
      console.error('Error fetching minted NFTs:', error);
    } finally {
      setLoadingNFTs(false);
    }
  };

  const fetchPricing = async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch('/api/los-bros/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      });
      
      const data = await response.json();
      if (data.success) {
        setPricing(data.pricing);
        console.log('💰 Pricing:', data.pricing);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const fetchAllocations = async () => {
    try {
      const response = await fetch('/api/los-bros/allocations');
      const data = await response.json();
      if (data.success) {
        setAllocations(data.allocations || []);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  };

  const handleMint = async () => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      // Mint Los Bros NFT
      const { losBrosMintingService } = await import('@/lib/los-bros-minting');
      const result = await losBrosMintingService.mintLosBrosNFT(
        publicKey,
        signTransaction,
        sendTransaction
      );

      if (!result.success) {
        throw new Error(result.error || 'Mint failed');
      }

      console.log('✅ Los Bros NFT minted!', result);

      // Record in database
      await fetch('/api/los-bros/record-mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAddress: result.mintAddress,
          walletAddress: publicKey.toString(),
          losBrosTokenId: result.mintAddress,
          losBrosRarity: result.rarityTier,
          rarityScore: result.rarityScore,
          traits: result.traits,
          signature: result.signature,
          metadataUri: result.metadataUri,
          // Include tier info if available
          losBrosTier: pricing?.tier,
          losBrosDiscountPercent: pricing?.discount,
          losBrosFinalPrice: pricing?.finalPrice,
          losBrosPlatformFee: pricing?.platformFee,
          lolBalanceAtMint: pricing?.tokenBalance,
        }),
      });

      // Show reveal modal
      setMintedNFT(result);
      setShowReveal(true);

      // Refresh NFT list
      setTimeout(fetchMintedNFTs, 2000);

    } catch (error: any) {
      console.error('❌ Mint error:', error);
      alert(error.message || 'Mint failed');
    } finally {
      setLoading(false);
    }
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getExplorerUrl = (address: string) => {
    return `https://explorer.analos.io/address/${address}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header with Featured Image */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-cyan-400">
              <img 
                src="https://cyan-bewildered-ape-960.mypinata.cloud/ipfs/bafkreibvzv6vs7x6nybnf6sabncen57t4zvdixgdaqo4swmijy2dm7lfkm"
                alt="Los Bros Collection"
                className="w-full h-full object-cover"
                style={{imageRendering: 'pixelated'}}
              />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4 font-mono tracking-wider">
            LOS BROS
          </h1>
          <p className="text-xl text-cyan-300 font-bold mb-2">#VAPORWAVE PFPs on ANALOS</p>
          <p className="text-gray-300 max-w-2xl mx-auto">
            2,222 unique pixel art PFPs with over 10,000 trait combinations. 
            Dynamic pricing starts at 4,200.69 LOS and increases 6.9% with each mint.
          </p>
        </div>

        {/* Live Allocations */}
        {allocations.length > 0 && (
          <div className="mb-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">📊 Live Mint Allocations</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {allocations.map((alloc: any) => (
                <div key={alloc.tier} className="bg-black/40 rounded-lg p-4 border-2 border-cyan-400/30">
                  <div className={`text-lg font-bold mb-2 ${
                    alloc.tier === 'TEAM' ? 'text-yellow-300' :
                    alloc.tier === 'COMMUNITY' ? 'text-green-300' :
                    alloc.tier === 'EARLY' ? 'text-blue-300' :
                    'text-purple-300'
                  }`}>
                    {alloc.tier}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {alloc.minted_count || alloc.live_minted_count || 0} / {alloc.total_allocated}
                  </div>
                  <div className="h-2 bg-black/60 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        alloc.tier === 'TEAM' ? 'bg-yellow-400' :
                        alloc.tier === 'COMMUNITY' ? 'bg-green-400' :
                        alloc.tier === 'EARLY' ? 'bg-blue-400' :
                        'bg-purple-400'
                      }`}
                      style={{ width: `${((alloc.minted_count || 0) / alloc.total_allocated * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mint Section */}
        <div className="mb-12 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-8 border-2 border-purple-400/30">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">🎨 Mint Your Los Bro</h2>
          
          {!connected ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔌</div>
              <p className="text-xl text-gray-300 mb-4">Connect your wallet to mint</p>
              <p className="text-sm text-gray-400">Check your tier and see if you qualify for discounts!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pricing Display */}
              {pricing && (
                <div className={`rounded-xl p-6 border-2 ${
                  pricing.tier === 'TEAM' ? 'bg-yellow-900/30 border-yellow-400' :
                  pricing.tier === 'COMMUNITY' ? 'bg-green-900/30 border-green-400' :
                  pricing.tier === 'EARLY' ? 'bg-blue-900/30 border-blue-400' :
                  'bg-purple-900/30 border-purple-400'
                }`}>
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-2">Your Tier</div>
                    <div className="text-3xl font-bold text-white mb-2">{pricing.tier}</div>
                    <div className="text-gray-300 mb-4">{pricing.message}</div>
                    
                    {pricing.discount > 0 && (
                      <div className="inline-block bg-green-500/20 border border-green-400 rounded-full px-4 py-1 text-green-300 font-bold mb-3">
                        {pricing.discount}% OFF!
                      </div>
                    )}
                    
                    <div className="text-5xl font-bold text-white mb-2">
                      {pricing.finalPrice.toFixed(2)} LOS
                    </div>
                    
                    {!pricing.holdingPeriodMet && (
                      <div className="mt-4 p-4 bg-cyan-900/30 border border-cyan-400 rounded-lg">
                        <div className="text-cyan-300 font-semibold mb-2">⏰ Holding Period Required</div>
                        <div className="text-sm text-gray-300">
                          You've held $LOL for {pricing.holdingPeriodHours.toFixed(1)} hours.
                          Need {(72 - pricing.holdingPeriodHours).toFixed(1)} more hours for discount.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mint Button */}
              <button
                onClick={handleMint}
                disabled={loading || !pricing?.holdingPeriodMet}
                className={`w-full py-5 px-8 rounded-xl font-bold text-xl transition-all ${
                  loading || !pricing?.holdingPeriodMet
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Minting...
                  </span>
                ) : !pricing?.holdingPeriodMet ? (
                  '⏰ Holding Period Not Met'
                ) : (
                  '🎨 Mint Los Bro NFT'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Recently Minted Gallery */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6">🎨 Recently Minted Los Bros</h2>
          
          {loadingNFTs ? (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-300">Loading minted NFTs...</p>
            </div>
          ) : mintedNFTs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <p className="text-xl text-gray-300 mb-2">No Los Bros minted yet!</p>
              <p className="text-gray-400">Be the first to mint!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mintedNFTs.map((nft: any, index: number) => (
                <div key={nft.mint_address || index} className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-xl overflow-hidden border-2 border-cyan-400/30 hover:border-cyan-400 transition-all hover:scale-105">
                  
                  {/* NFT Image */}
                  <div className="aspect-square bg-black/20 relative">
                    <img 
                      src={nft.image_url || `https://cyan-bewildered-ape-960.mypinata.cloud/ipfs/bafkreibvzv6vs7x6nybnf6sabncen57t4zvdixgdaqo4swmijy2dm7lfkm`}
                      alt={`Los Bro #${nft.los_bros_token_id || nft.mint_address?.slice(0, 8)}`}
                      className="w-full h-full object-cover"
                      style={{imageRendering: 'pixelated'}}
                      onError={(e) => {
                        // Fallback to placeholder
                        (e.target as HTMLImageElement).src = `https://cyan-bewildered-ape-960.mypinata.cloud/ipfs/bafkreibvzv6vs7x6nybnf6sabncen57t4zvdixgdaqo4swmijy2dm7lfkm`;
                      }}
                    />
                    
                    {/* Rarity Badge */}
                    {nft.los_bros_rarity && (
                      <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold ${
                        nft.los_bros_rarity === 'LEGENDARY' ? 'bg-yellow-400 text-black' :
                        nft.los_bros_rarity === 'EPIC' ? 'bg-purple-500 text-white' :
                        nft.los_bros_rarity === 'RARE' ? 'bg-blue-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {nft.los_bros_rarity}
                      </div>
                    )}
                  </div>

                  {/* NFT Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        Los Bros #{shortenAddress(nft.los_bros_token_id || nft.mint_address)}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Minted by @{nft.username || shortenAddress(nft.wallet_address)}
                      </p>
                    </div>

                    {/* Token ID - Clickable */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Token ID:</span>
                      <a 
                        href={getExplorerUrl(nft.los_bros_token_id || nft.mint_address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-mono underline"
                      >
                        {shortenAddress(nft.los_bros_token_id || nft.mint_address)}
                      </a>
                    </div>

                    {/* Rarity Score */}
                    {nft.rarity_score && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Rarity Score:</span>
                        <span className="text-white font-bold">{nft.rarity_score.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Mint Date */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Minted:</span>
                      <span className="text-gray-300">
                        {new Date(nft.mint_date || nft.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* View on Explorer Button */}
                    <a
                      href={getExplorerUrl(nft.los_bros_token_id || nft.mint_address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-300 py-2 rounded-lg text-sm font-semibold transition-all"
                    >
                      🔍 View on Explorer
                    </a>

                    {/* Metadata Link */}
                    {nft.metadata_uri && (
                      <a
                        href={nft.metadata_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 text-purple-300 py-2 rounded-lg text-sm font-semibold transition-all"
                      >
                        📄 View Metadata
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Reveal Modal */}
      {showReveal && mintedNFT && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-8 max-w-2xl w-full border-4 border-cyan-400 relative">
            <button
              onClick={() => setShowReveal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
            >
              ✕
            </button>
            
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold text-white mb-4">Los Bro Minted!</h2>
              
              <div className="w-64 h-64 mx-auto mb-6 rounded-xl overflow-hidden border-4 border-cyan-400">
                <img 
                  src={mintedNFT.imageUrl || `https://cyan-bewildered-ape-960.mypinata.cloud/ipfs/bafkreibvzv6vs7x6nybnf6sabncen57t4zvdixgdaqo4swmijy2dm7lfkm`}
                  alt="Your Los Bro"
                  className="w-full h-full object-cover"
                  style={{imageRendering: 'pixelated'}}
                />
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Rarity:</span>
                  <span className={`font-bold ${
                    mintedNFT.rarityTier === 'LEGENDARY' ? 'text-yellow-400' :
                    mintedNFT.rarityTier === 'EPIC' ? 'text-purple-400' :
                    mintedNFT.rarityTier === 'RARE' ? 'text-blue-400' :
                    'text-gray-300'
                  }`}>
                    {mintedNFT.rarityTier}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Score:</span>
                  <span className="text-white font-bold">{mintedNFT.rarityScore?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Token ID:</span>
                  <a 
                    href={getExplorerUrl(mintedNFT.mintAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 font-mono underline"
                  >
                    {shortenAddress(mintedNFT.mintAddress)}
                  </a>
                </div>
              </div>

              <div className="flex gap-4">
                <a
                  href={getExplorerUrl(mintedNFT.mintAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-lg font-semibold transition-all"
                >
                  🔍 View on Explorer
                </a>
                <button
                  onClick={() => {
                    setShowReveal(false);
                    fetchMintedNFTs();
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

