import { useMemo } from 'react';
import { Connection } from '@solana/web3.js';

export function useWebSocketDisabledConnection(endpoint: string) {
  return useMemo(() => {
    // Use standard HTTP/WebSocket behavior. Avoid long-lived subscriptions at the app level.
    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: false,
      confirmTransactionInitialTimeout: 180000,
    });
    return connection;
  }, [endpoint]);
}
