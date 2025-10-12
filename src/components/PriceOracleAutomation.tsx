'use client';

import React, { useState, useEffect } from 'react';
import { backendAPI } from '@/lib/backend-api';

interface AutomationStatus {
  running: boolean;
  enabled: boolean;
  lastKnownPrice: number;
  lastUpdateTime: number;
  checkIntervalSeconds: number;
  updateThresholdPercent: number;
  cooldownSeconds: number;
  consecutiveErrors: number;
  nextCheckIn: number | null;
}

export default function PriceOracleAutomation() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Configuration
  const [checkInterval, setCheckInterval] = useState(60); // seconds
  const [updateThreshold, setUpdateThreshold] = useState(1.0); // percent
  const [cooldown, setCooldown] = useState(300); // seconds

  // Load status on mount
  useEffect(() => {
    loadStatus();
    
    // Refresh status every 10 seconds
    const intervalId = setInterval(loadStatus, 10000);
    
    return () => clearInterval(intervalId);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch(`/api/proxy/api/oracle/automation/status`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        setCheckInterval(data.data.checkIntervalSeconds);
        setUpdateThreshold(data.data.updateThresholdPercent);
        setCooldown(data.data.cooldownSeconds);
      }
    } catch (error) {
      console.error('Failed to load automation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setActionLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/proxy/api/oracle/automation/start`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Automation started successfully!');
        setStatus(data.data);
      } else {
        setMessage('❌ Failed to start: ' + data.error);
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/proxy/api/oracle/automation/stop`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Automation stopped successfully!');
        setStatus(data.data);
      } else {
        setMessage('❌ Failed to stop: ' + data.error);
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setActionLoading(true);
    setMessage('');
    
    try {
      const response = await fetch(`/api/proxy/api/oracle/automation/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkIntervalMs: checkInterval * 1000,
          updateThresholdPercent: updateThreshold,
          minTimeBetweenUpdates: cooldown * 1000,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Configuration updated! Automation restarted with new settings.');
        setStatus(data.data);
      } else {
        setMessage('❌ Failed to update: ' + data.error);
      }
    } catch (error: any) {
      setMessage('❌ Error: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading automation status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-4">🤖 Automated Price Oracle Updates</h2>
        <p className="text-gray-300">
          Automatically update the Price Oracle when LOS price changes by a configurable threshold.
          The system monitors multiple price feeds and updates the oracle on-chain.
        </p>
      </div>

      {/* Status */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Status</h3>
          <div className={`px-4 py-2 rounded-full font-semibold ${
            status?.running 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {status?.running ? '🟢 Running' : '⭕ Stopped'}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Last Known Price</div>
            <div className="text-2xl font-bold text-white">
              ${status?.lastKnownPrice.toFixed(6) || '0.000000'}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Last Update</div>
            <div className="text-2xl font-bold text-white">
              {status?.lastUpdateTime 
                ? new Date(status.lastUpdateTime).toLocaleString() 
                : 'Never'}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Check Interval</div>
            <div className="text-2xl font-bold text-white">
              {status?.checkIntervalSeconds}s
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Update Threshold</div>
            <div className="text-2xl font-bold text-white">
              {status?.updateThresholdPercent}%
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Cooldown Period</div>
            <div className="text-2xl font-bold text-white">
              {status?.cooldownSeconds}s
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Consecutive Errors</div>
            <div className={`text-2xl font-bold ${
              (status?.consecutiveErrors || 0) > 0 ? 'text-red-400' : 'text-white'
            }`}>
              {status?.consecutiveErrors || 0}
            </div>
          </div>
        </div>

        {/* Next Check Timer */}
        {status?.running && status?.nextCheckIn !== null && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="text-blue-400">⏱️</div>
              <div>
                <div className="text-sm text-blue-300 font-semibold">Next Check In:</div>
                <div className="text-white">
                  {Math.ceil((status.nextCheckIn || 0) / 1000)} seconds
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={handleStart}
            disabled={actionLoading || status?.running}
            className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            {actionLoading ? 'Processing...' : '▶️ Start Automation'}
          </button>
          
          <button
            onClick={handleStop}
            disabled={actionLoading || !status?.running}
            className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            {actionLoading ? 'Processing...' : '⏸️ Stop Automation'}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-4 ${
            message.includes('✅') ? 'bg-green-500/20 border border-green-500/50' :
            'bg-red-500/20 border border-red-500/50'
          }`}>
            <p className="text-white">{message}</p>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">⚙️ Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Check Interval (seconds)
            </label>
            <input
              type="number"
              min="30"
              max="3600"
              value={checkInterval}
              onChange={(e) => setCheckInterval(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              How often to check the price (default: 60s)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Update Threshold (%)
            </label>
            <input
              type="number"
              min="0.1"
              max="100"
              step="0.1"
              value={updateThreshold}
              onChange={(e) => setUpdateThreshold(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum price change % to trigger update (default: 1%)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cooldown Period (seconds)
            </label>
            <input
              type="number"
              min="60"
              max="3600"
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum time between updates (default: 300s = 5 min)
            </p>
          </div>

          <button
            onClick={handleUpdateConfig}
            disabled={actionLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
          >
            {actionLoading ? 'Updating...' : '💾 Save Configuration'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ How It Works</h3>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Monitors LOS price from multiple sources (CoinGecko, Jupiter, etc.)</li>
          <li>• Updates oracle automatically when price changes by threshold %</li>
          <li>• Cooldown period prevents too-frequent updates</li>
          <li>• Stops automatically after 5 consecutive errors</li>
          <li>• Requires authority wallet keypair on backend</li>
        </ul>
      </div>
    </div>
  );
}

