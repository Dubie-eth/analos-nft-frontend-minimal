// Backend Configuration
// Centralized configuration for all backend API calls

export const BACKEND_CONFIG = {
  // Route through Next.js server proxy; server reads real backend URL
  BASE_URL: '/api/proxy',
  
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    IPFS_UPLOAD_FILE: '/api/ipfs/upload-file',
    IPFS_UPLOAD_JSON: '/api/ipfs/upload-json',
    IPFS_TEST: '/api/ipfs/test',
    RPC_PROXY: '/api/rpc/proxy',
    RPC_ACCOUNT: '/api/rpc/account',
    RPC_TOKEN_SUPPLY: '/api/rpc/token-supply',
    RPC_TRANSACTION: '/api/rpc/transaction',
    WEBHOOK_ANALOS_EVENT: '/api/webhook/analos-event',
    WEBHOOK_START_LISTENER: '/api/webhook/start-listener',
    WEBHOOK_STOP_LISTENER: '/api/webhook/stop-listener',
    WEBHOOK_STATUS: '/api/webhook/status',
  },
  
  // Request timeout (in milliseconds)
  TIMEOUT: 30000,
  
  // Rate limiting configuration
  RATE_LIMIT: {
    WINDOW_MS: 900000, // 15 minutes
    MAX_REQUESTS: 100,
  },
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get headers with API key
export const getApiHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
  return {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
};

// Helper function for authenticated fetch requests
export const authenticatedFetch = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const headers = getApiHeaders();
  
  // Merge headers
  const mergedHeaders = {
    ...headers,
    ...options.headers,
  };
  
  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
};

// Health check function
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildApiUrl(BACKEND_CONFIG.ENDPOINTS.HEALTH));
    const data = await response.json();
    return data.status === 'healthy' || data.status === 'ok';
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

// Export the old URL for reference (will be removed after migration)
export const OLD_BACKEND_URL = 'https://analos-nft-launcher-backend-production.up.railway.app';

export default BACKEND_CONFIG;
