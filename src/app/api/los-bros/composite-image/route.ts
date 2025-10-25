import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

/**
 * GET /api/los-bros/composite-image?tokenId=X
 * Generates a composite image from trait layers for Los Bros NFTs
 * 
 * This uses HTML Canvas to layer PNG images on top of each other
 * Returns a data URL that can be used as an image source
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenId = searchParams.get('tokenId');

  if (!tokenId) {
    return NextResponse.json({ error: 'tokenId required' }, { status: 400 });
  }

  try {
    // Get NFT traits and metadata from database
    const supabase = getSupabaseAdmin();
    // @ts-ignore - Supabase types don't include Los Bros columns yet
    const { data: nft, error } = await (supabase as any)
      .from('profile_nfts')
      .select('los_bros_traits, los_bros_token_id, mint_address, nft_metadata')
      .eq('los_bros_token_id', tokenId)
      .single();

    if (error || !nft) {
      console.log(`⚠️ NFT #${tokenId} not found in database, using fallback SVG`);
      // Fallback to SVG if not in database
      return generateFallbackSVG(tokenId);
    }

    // Check if NFT is revealed (default to true for backward compatibility)
    const isRevealed = nft.nft_metadata?.is_revealed !== false;
    
    if (!isRevealed) {
      console.log(`🔒 NFT #${tokenId} is not revealed, showing placeholder`);
      return generatePlaceholderHTML(tokenId);
    }

    const traits = nft.los_bros_traits as any[];
    
    if (!traits || traits.length === 0) {
      console.log(`⚠️ NFT #${tokenId} has no traits, using fallback SVG`);
      return generateFallbackSVG(tokenId);
    }

    console.log(`🎨 Generating composite image for Los Bros #${tokenId}`, traits);

    // Build HTML that layers the traits using CSS
    const html = generateCompositeHTML(tokenId, traits);

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: any) {
    console.error('❌ Error generating composite image:', error);
    return generateFallbackSVG(tokenId);
  }
}

/**
 * Generate HTML canvas that layers trait images
 */
function generateCompositeHTML(tokenId: string, traits: any[]): string {
  console.log(`🎨 Building composite for #${tokenId} with traits:`, traits);
  
  // Map trait types to folder names and layer order (bottom to top)
  const layerMapping: Record<string, string> = {
    'Background': 'Background',
    'Body': 'Bodys',
    'Clothes': 'Clothes',
    'Mouth': 'Mouth',
    'Eyes': 'Eyes',
    'Hat': 'Hats'
  };
  
  // Build image layers in correct order (bottom to top)
  // Background → Body → Clothes → Mouth → Eyes → Hat
  const layerOrder = ['Background', 'Body', 'Clothes', 'Mouth', 'Eyes', 'Hat'];
  
  const layers = layerOrder
    .map(traitType => {
      const trait = traits.find(t => 
        t.trait_type === traitType || 
        t.trait_type === `${traitType}s` ||
        (traitType === 'Hat' && t.trait_type === 'Hats')
      );
      
      if (!trait || trait.value === 'None') {
        console.log(`  ⏭️ Skipping ${traitType}: ${trait?.value || 'not found'}`);
        return null;
      }
      
      // Convert trait value to filename
      const fileName = trait.value.toLowerCase().replace(/ /g, '_');
      const folder = layerMapping[traitType] || `${traitType}s`;
      const path = `/los-bros-traits/${folder}/${fileName}.png`;
      
      console.log(`  ✅ ${traitType}: ${trait.value} → ${path}`);
      return path;
    })
    .filter(Boolean);

  console.log(`🎨 Final composite layers for #${tokenId}:`, layers);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { 
      width: 100%; 
      height: 100%; 
      overflow: hidden;
      background: transparent;
    }
    #container {
      width: 100%;
      height: 100%;
      position: relative;
      background: transparent;
    }
    .layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
      image-rendering: -moz-crisp-edges;
      image-rendering: crisp-edges;
      font-size: 0;
      line-height: 0;
    }
    .layer::before,
    .layer::after {
      display: none;
    }
  </style>
</head>
<body>
  <div id="container">
    ${layers.map((layer) => `
      <img src="${layer}" class="layer" alt="" />
    `).join('')}
  </div>
</body>
</html>
  `;
}

/**
 * Placeholder HTML for unrevealed NFTs
 */
function generatePlaceholderHTML(tokenId: string): NextResponse {
  const hue1 = (parseInt(tokenId) * 137) % 360;
  const hue2 = (hue1 + 60) % 360;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 500px;
      height: 500px;
      background: linear-gradient(135deg, hsl(${hue1}, 70%, 20%), hsl(${hue2}, 70%, 20%));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: 'Arial', sans-serif;
      color: white;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .mystery-box {
      width: 300px;
      height: 300px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    
    .lock-icon {
      font-size: 60px;
      margin-bottom: 20px;
      opacity: 0.8;
    }
    
    .title {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    .token-id {
      font-size: 48px;
      font-weight: bold;
      margin: 20px 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    .subtitle {
      font-size: 16px;
      opacity: 0.7;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .reveal-text {
      position: absolute;
      bottom: 30px;
      font-size: 14px;
      opacity: 0.6;
      animation: blink 1.5s infinite;
    }
    
    @keyframes blink {
      0%, 50% { opacity: 0.6; }
      51%, 100% { opacity: 0.3; }
    }
  </style>
</head>
<body>
  <div class="mystery-box">
    <div class="lock-icon">🔒</div>
    <div class="title">LOS BROS</div>
    <div class="token-id">#${tokenId}</div>
    <div class="subtitle">Not Yet Revealed</div>
  </div>
  <div class="reveal-text">Awaiting reveal by collection founder</div>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300', // 5 minutes cache for unrevealed
    },
  });
}

/**
 * Fallback SVG generator
 */
function generateFallbackSVG(tokenId: string): NextResponse {
  const hue1 = (parseInt(tokenId) * 137) % 360;
  const hue2 = (hue1 + 60) % 360;

  const svg = `
    <svg width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${tokenId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue1},70%,50%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${hue2},70%,50%);stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <rect width="500" height="500" fill="url(#grad${tokenId})"/>
      <rect x="10" y="10" width="480" height="480" fill="none" stroke="white" stroke-width="4" rx="20"/>
      
      <text x="250" y="100" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">
        LOS BROS
      </text>
      
      <text x="250" y="250" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">
        #${tokenId}
      </text>
      
      <text x="250" y="450" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" opacity="0.7">
        Analos Collection
      </text>
    </svg>
  `;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

