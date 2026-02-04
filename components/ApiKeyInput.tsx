import React, { useState } from 'react';
import { Key, ArrowRight, ExternalLink, X } from 'lucide-react';

interface Props {
  onSave: (key: string) => void;
  onCancel?: () => void;
}

export const ApiKeyInput: React.FC<Props> = ({ onSave, onCancel }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim().length > 0) {
      onSave(inputKey.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full relative">
        {onCancel && (
            <button 
                onClick={onCancel}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                title="Cancel"
            >
                <X className="w-5 h-5" />
            </button>
        )}
        
        <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key className="w-8 h-8 text-blue-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Enter API Key</h2>
        <p className="text-slate-400 mb-8">
          To find value bets, this app needs a key from The-Odds-API. It is stored locally on your device.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Paste your API key here..."
              className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-slate-600"
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            disabled={!inputKey}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Start Scanning <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700">
          <a 
            href="https://the-odds-api.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
          >
            Get a free key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};