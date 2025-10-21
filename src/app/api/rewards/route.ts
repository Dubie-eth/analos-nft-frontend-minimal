import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('userWallet');

    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet parameter is required' },
        { status: 400 }
      );
    }

    // Return empty rewards if database not configured
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        success: true,
        rewards: [], 
        summary: { 
          total_claimable: 0, 
          total_claimed: 0, 
          pending_rewards: 0 
        } 
      });
    }

    // Try to get user's rewards (gracefully handle missing tables)
    try {
      const { data: rewards, error: rewardsError } = await (supabaseAdmin as any)
        .from('creator_rewards')
        .select(`
          *,
          saved_collections!inner(collection_name, collection_symbol)
        `)
        .eq('user_wallet', userWallet)
        .order('created_at', { ascending: false });

      // If table doesn't exist, return empty
      if (rewardsError) {
        console.log('Rewards table not available:', rewardsError.message);
        return NextResponse.json({
          success: true,
          rewards: [],
          summary: { 
            total_claimable: 0, 
            total_claimed: 0, 
            pending_rewards: 0 
          }
        });
      }

      // Try to get summary (optional RPC function)
      let summary = { total_claimable: 0, total_claimed: 0, pending_rewards: 0 };
      try {
        const { data: summaryData } = await (supabaseAdmin as any).rpc('get_user_total_rewards', { 
          user_wallet_param: userWallet 
        });
        if (summaryData?.[0]) {
          summary = summaryData[0];
        }
      } catch (rpcError) {
        console.log('RPC function not available, using empty summary');
      }

      return NextResponse.json({
        success: true,
        rewards: rewards || [],
        summary
      });
    } catch (dbError) {
      // Any database error - return empty instead of failing
      console.log('Database error in rewards API:', dbError);
      return NextResponse.json({
        success: true,
        rewards: [],
        summary: { 
          total_claimable: 0, 
          total_claimed: 0, 
          pending_rewards: 0 
        }
      });
    }

  } catch (error) {
    console.error('Error in get rewards API:', error);
    // Return empty instead of error
    return NextResponse.json({
      success: true,
      rewards: [],
      summary: { 
        total_claimable: 0, 
        total_claimed: 0, 
        pending_rewards: 0 
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userWallet, rewardType, amount, tokenMint, tokenSymbol, collectionId } = body;

    // Validate required fields
    if (!userWallet || !rewardType || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userWallet, rewardType, amount' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // Create new reward
    const { data, error } = await (supabaseAdmin as any)
      .from('creator_rewards')
      .insert({
        user_wallet: userWallet,
        collection_id: collectionId || null,
        reward_type: rewardType,
        amount: amount,
        token_mint: tokenMint || null,
        token_symbol: tokenSymbol || 'LOS',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reward:', error);
      return NextResponse.json(
        { error: 'Failed to create reward' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reward: data,
      message: 'Reward created successfully'
    });

  } catch (error) {
    console.error('Error in create reward API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
