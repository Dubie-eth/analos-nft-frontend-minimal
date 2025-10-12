/**
 * Backend API Client
 * Centralized service for all backend API calls
 * Client-side calls are routed through Next.js server proxy
 */

// Backend Configuration
export const BACKEND_CONFIG = {
  // Always call server-side proxy; backend URL and API key are server-only
  BASE_URL: '/api/proxy',
  TIMEOUT: 30000, // 30 seconds
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Health
  HEALTH: '/health',
  
  // IPFS
  IPFS_UPLOAD_FILE: '/api/ipfs/upload-file',
  IPFS_UPLOAD_JSON: '/api/ipfs/upload-json',
  IPFS_TEST: '/api/ipfs/test',
  
  // RPC Proxy
  RPC_PROXY: '/api/rpc/proxy',
  
  // Webhooks
  WEBHOOK_ANALOS_EVENT: '/api/webhook/analos-event',
};

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface IPFSUploadResponse {
  success: boolean;
  cid?: string;
  url?: string;
  error?: string;
}

export interface RPCProxyResponse {
  jsonrpc: string;
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Backend API Client Class
 */
export class BackendAPIClient {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = BACKEND_CONFIG.BASE_URL;
    this.timeout = BACKEND_CONFIG.TIMEOUT;
    
    console.log('🔗 Backend API Client initialized');
    console.log('📍 Base URL:', this.baseURL);
  }

  /**
   * Make authenticated fetch request
   */
  private async authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = new Headers(options.headers);
    
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; message: string }>> {
    try {
      console.log('🏥 Checking backend health...');
      const response = await this.authenticatedFetch(API_ENDPOINTS.HEALTH, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Backend health check passed:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Backend health check failed:', error);
      return {
        success: false,
        error: error.message || 'Health check failed',
      };
    }
  }

  /**
   * Test IPFS Connection
   */
  async testIPFS(): Promise<ApiResponse<{ message: string }>> {
    try {
      console.log('🧪 Testing IPFS connection...');
      const response = await this.authenticatedFetch(API_ENDPOINTS.IPFS_TEST, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `IPFS test failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ IPFS connection test passed:', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ IPFS connection test failed:', error);
      return {
        success: false,
        error: error.message || 'IPFS test failed',
      };
    }
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFileToIPFS(file: File): Promise<IPFSUploadResponse> {
    try {
      console.log('📤 Uploading file to IPFS:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.authenticatedFetch(API_ENDPOINTS.IPFS_UPLOAD_FILE, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ File uploaded to IPFS:', data);
      return data;
    } catch (error: any) {
      console.error('❌ File upload failed:', error);
      return {
        success: false,
        error: error.message || 'File upload failed',
      };
    }
  }

  /**
   * Upload JSON metadata to IPFS via Pinata
   */
  async uploadJSONToIPFS(jsonContent: object, name: string): Promise<IPFSUploadResponse> {
    try {
      console.log('📤 Uploading JSON to IPFS:', name);
      
      const response = await this.authenticatedFetch(API_ENDPOINTS.IPFS_UPLOAD_JSON, {
        method: 'POST',
        body: JSON.stringify({ name, jsonContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ JSON uploaded to IPFS:', data);
      return data;
    } catch (error: any) {
      console.error('❌ JSON upload failed:', error);
      return {
        success: false,
        error: error.message || 'JSON upload failed',
      };
    }
  }

  /**
   * Proxy RPC request to Analos blockchain
   */
  async proxyRPCRequest(method: string, params: any[]): Promise<RPCProxyResponse> {
    try {
      console.log('📡 Proxying RPC request:', method);
      
      const response = await this.authenticatedFetch(API_ENDPOINTS.RPC_PROXY, {
        method: 'POST',
        body: JSON.stringify({ method, params }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `RPC request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ RPC request completed:', method);
      return data;
    } catch (error: any) {
      console.error('❌ RPC request failed:', error);
      return {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -1,
          message: error.message || 'RPC request failed',
        },
      };
    }
  }

  /**
   * Get latest blockhash from blockchain
   */
  async getLatestBlockhash(): Promise<ApiResponse<any>> {
    try {
      const response = await this.proxyRPCRequest('getLatestBlockhash', [
        { commitment: 'confirmed' },
      ]);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        success: true,
        data: response.result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get latest blockhash',
      };
    }
  }

  /**
   * Get account info from blockchain
   */
  async getAccountInfo(address: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.proxyRPCRequest('getAccountInfo', [
        address,
        { encoding: 'jsonParsed' },
      ]);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        success: true,
        data: response.result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get account info',
      };
    }
  }

  /**
   * Get program accounts from blockchain
   */
  async getProgramAccounts(programId: string, config?: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.proxyRPCRequest('getProgramAccounts', [
        programId,
        config || { encoding: 'jsonParsed' },
      ]);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        success: true,
        data: response.result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get program accounts',
      };
    }
  }

  /**
   * Get transaction details from blockchain
   */
  async getTransaction(signature: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.proxyRPCRequest('getTransaction', [
        signature,
        { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 },
      ]);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        success: true,
        data: response.result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get transaction',
      };
    }
  }
}

// Export singleton instance
export const backendAPI = new BackendAPIClient();

// Export convenience functions
export const healthCheck = () => backendAPI.healthCheck();
export const testIPFS = () => backendAPI.testIPFS();
export const uploadFileToIPFS = (file: File) => backendAPI.uploadFileToIPFS(file);
export const uploadJSONToIPFS = (jsonContent: object, name: string) => 
  backendAPI.uploadJSONToIPFS(jsonContent, name);
export const proxyRPCRequest = (method: string, params: any[]) => 
  backendAPI.proxyRPCRequest(method, params);
export const getLatestBlockhash = () => backendAPI.getLatestBlockhash();
export const getAccountInfo = (address: string) => backendAPI.getAccountInfo(address);
export const getProgramAccounts = (programId: string, config?: any) => 
  backendAPI.getProgramAccounts(programId, config);
export const getTransaction = (signature: string) => backendAPI.getTransaction(signature);

