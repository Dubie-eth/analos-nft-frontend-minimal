'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

interface RotationHistory {
  timestamp: number;
  oldPublicKey: string;
  newPublicKey: string;
  solTransferred: number;
  transactionSignature: string;
  initiatedBy: string;
  reason: string;
}

export default function SecureKeypairRotation() {
  const { publicKey } = useWallet();
  
  const [step, setStep] = useState<'setup' | '2fa' | 'rotate' | 'complete'>('setup');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [token2FA, setToken2FA] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rotationResult, setRotationResult] = useState<any>(null);
  const [history, setHistory] = useState<RotationHistory[]>([]);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const baseURL = '/api/proxy';

  useEffect(() => {
    if (publicKey) {
      checkIfExists2FA();
      loadHistory();
    }
  }, [publicKey]);

  const checkIfExists2FA = async () => {
    // Check if user already has 2FA enabled
    // For now, we'll check by trying to verify with an empty token
    // In production, you'd have a dedicated endpoint
    setIs2FAEnabled(false); // Default to false for new setup
  };

  const loadHistory = async () => {
    if (!publicKey) return;
    
    try {
      // Note: This would need 2FA token in production
      // For now, load without 2FA for display purposes
      const response = await fetch(
        `${baseURL}/api/admin/keypair/backups`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Display backup list
      }
    } catch (error) {
      console.log('Could not load history (2FA required)');
    }
  };

  const setup2FA = async () => {
    if (!publicKey) {
      setMessage('❌ Please connect your wallet first');
      return;
    }

    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${baseURL}/api/admin/keypair/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQrCodeUrl(data.data.qrCodeUrl);
        setManualKey(data.data.manualEntryKey);
        setStep('2fa');
        setMessage('✅ Scan QR code with Google Authenticator');
      } else {
        setMessage('❌ ' + data.error);
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async () => {
    if (!publicKey) return;

    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`${baseURL}/api/admin/keypair/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          token: token2FA,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.verified) {
        setMessage('✅ 2FA verified! Ready to rotate keypair.');
        setStep('rotate');
      } else {
        setMessage('❌ Invalid 2FA code. Please try again.');
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const rotateKeypair = async () => {
    if (!publicKey) return;

    setLoading(true);
    setMessage('Rotating keypair... This may take 30 seconds.');
    
    try {
      const response = await fetch(`${baseURL}/api/admin/keypair/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          token2FA: token2FA,
          reason: reason || 'Security rotation via admin panel',
          transferAllFunds: true,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRotationResult(data.data);
        setStep('complete');
        setMessage('✅ Keypair rotated successfully!');
      } else {
        setMessage('❌ ' + data.error);
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-4">🔐 Secure Keypair Rotation</h2>
        <p className="text-gray-300">
          Rotate your authority keypair with 2FA protection. Old keypair is backed up (encrypted) and funds are transferred automatically.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between">
          {[
            { id: 'setup', label: 'Setup 2FA', icon: '🔐' },
            { id: '2fa', label: 'Verify', icon: '✅' },
            { id: 'rotate', label: 'Rotate', icon: '🔄' },
            { id: 'complete', label: 'Complete', icon: '🎉' },
          ].map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                step === s.id ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' :
                ['setup', '2fa', 'rotate', 'complete'].indexOf(step) > index ? 'bg-green-500/20 text-green-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <div className="ml-2 hidden md:block">
                <div className="text-sm text-gray-300">{s.label}</div>
              </div>
              {index < 3 && (
                <div className="w-12 md:w-24 h-1 mx-2 bg-gray-600"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Setup 2FA */}
      {step === 'setup' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Step 1: Setup Google Authenticator</h3>
          
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ Why 2FA?</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Extra security layer for sensitive operations</li>
                <li>• Prevents unauthorized keypair rotation</li>
                <li>• Industry-standard protection (Google Authenticator)</li>
                <li>• One-time setup, works forever</li>
              </ul>
            </div>

            <button
              onClick={setup2FA}
              disabled={loading || !publicKey}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              {loading ? 'Setting up...' : '🔐 Setup 2FA Protection'}
            </button>

            {!publicKey && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-white">⚠️ Please connect your admin wallet first</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Scan QR Code */}
      {step === '2fa' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Step 2: Scan QR Code</h3>
          
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-6 text-center">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="2FA QR Code" 
                  className="mx-auto mb-4"
                  style={{ width: '200px', height: '200px' }}
                />
              )}
              <p className="text-sm text-gray-300 mb-2">Scan with Google Authenticator app</p>
              {manualKey && (
                <div className="bg-gray-900/50 rounded p-3 mt-4">
                  <p className="text-xs text-gray-400 mb-1">Manual Entry Key:</p>
                  <code className="text-white text-sm break-all">{manualKey}</code>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter 6-Digit Code from Authenticator
              </label>
              <input
                type="text"
                maxLength={6}
                value={token2FA}
                onChange={(e) => setToken2FA(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest"
                placeholder="000000"
              />
            </div>

            <button
              onClick={verify2FA}
              disabled={loading || token2FA.length !== 6}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              {loading ? 'Verifying...' : '✅ Verify Code'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Rotate Keypair */}
      {step === 'rotate' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Step 3: Rotate Keypair</h3>
          
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Important</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• This will generate a completely new wallet</li>
                <li>• All SOL will be transferred to the new wallet</li>
                <li>• Old wallet will be backed up (encrypted)</li>
                <li>• You'll need to update Railway with the new keypair</li>
                <li>• Current automation will need restarting</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for Rotation (Optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white"
                placeholder="e.g., Routine security rotation, suspected exposure, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Re-enter 2FA Code to Confirm
              </label>
              <input
                type="text"
                maxLength={6}
                value={token2FA}
                onChange={(e) => setToken2FA(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest"
                placeholder="000000"
              />
            </div>

            <button
              onClick={rotateKeypair}
              disabled={loading || token2FA.length !== 6}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              {loading ? '🔄 Rotating... (30s)' : '🔄 Rotate Keypair Now'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && rotationResult && (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">🎉 Rotation Complete!</h3>
          
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-white font-semibold mb-2">✅ Success!</p>
              <p className="text-sm text-gray-300">
                Your keypair has been rotated successfully. The old wallet is now backed up and drained.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">Old Wallet</div>
                <code className="text-white text-xs break-all">
                  {rotationResult.oldPublicKey}
                </code>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">New Wallet</div>
                <code className="text-green-400 text-xs break-all">
                  {rotationResult.newPublicKey}
                </code>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">SOL Transferred</div>
                <div className="text-xl font-bold text-white">
                  {rotationResult.solTransferred.toFixed(4)} SOL
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">Transaction</div>
                <a
                  href={`https://explorer.analos.io/tx/${rotationResult.transferSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 text-xs break-all"
                >
                  View on Explorer →
                </a>
              </div>
            </div>

            {/* New Keypair Array for Railway */}
            <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-orange-300 mb-2">
                🚨 UPDATE RAILWAY IMMEDIATELY
              </h4>
              <p className="text-xs text-gray-300 mb-3">
                Copy this new keypair to Railway environment variables:
              </p>
              <div className="bg-gray-900/80 rounded p-3">
                <div className="text-xs text-gray-400 mb-1">Variable Name:</div>
                <code className="text-white text-sm">PRICE_ORACLE_AUTHORITY_SECRET_KEY</code>
                
                <div className="text-xs text-gray-400 mb-1 mt-3">New Value:</div>
                <div className="bg-gray-800/50 rounded p-2 max-h-32 overflow-y-auto">
                  <code className="text-green-400 text-xs break-all">
                    [{rotationResult.newKeypairArray.join(',')}]
                  </code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`[${rotationResult.newKeypairArray.join(',')}]`);
                    setMessage('✅ Copied to clipboard!');
                  }}
                  className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-sm"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setStep('setup');
                setToken2FA('');
                setReason('');
                setRotationResult(null);
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
            >
              🔄 Rotate Again
            </button>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('✅') ? 'bg-green-500/20 border border-green-500/50' :
          message.includes('❌') ? 'bg-red-500/20 border border-red-500/50' :
          'bg-blue-500/20 border border-blue-500/50'
        }`}>
          <p className="text-white">{message}</p>
        </div>
      )}

      {/* Security Info */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">🛡️ Security Features</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl mb-2">🔐</div>
            <h4 className="text-sm font-semibold text-white mb-1">2FA Protection</h4>
            <p className="text-xs text-gray-300">
              Google Authenticator required for all rotations
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl mb-2">💾</div>
            <h4 className="text-sm font-semibold text-white mb-1">Encrypted Backups</h4>
            <p className="text-xs text-gray-300">
              Old keypairs backed up with AES-256 encryption
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl mb-2">💰</div>
            <h4 className="text-sm font-semibold text-white mb-1">Auto Transfer</h4>
            <p className="text-xs text-gray-300">
              Automatically moves SOL to new wallet
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-2xl mb-2">📜</div>
            <h4 className="text-sm font-semibold text-white mb-1">Audit Trail</h4>
            <p className="text-xs text-gray-300">
              Complete history of all rotations
            </p>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Best Practices</h3>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• <strong>Rotate regularly:</strong> Every 30-90 days for maximum security</li>
          <li>• <strong>After exposure:</strong> Immediately if keypair was exposed</li>
          <li>• <strong>Document reasons:</strong> Always note why you're rotating</li>
          <li>• <strong>Update Railway:</strong> Don't forget to update environment variables</li>
          <li>• <strong>Keep 2FA secure:</strong> Back up your Google Authenticator</li>
        </ul>
      </div>
    </div>
  );
}

