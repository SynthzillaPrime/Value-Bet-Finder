import React from "react";
import { X } from "lucide-react";

interface SettingsPanelProps {
  apiKey: string | null;
  showApiKeyInput: boolean;
  setShowApiKeyInput: (val: boolean) => void;
  newApiKey: string;
  setNewApiKey: (val: string) => void;
  setApiKey: (val: string) => void;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  apiKey,
  showApiKeyInput,
  setShowApiKeyInput,
  newApiKey,
  setNewApiKey,
  setApiKey,
  onClose,
}) => {
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Settings
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
            Odds API Key
          </label>
          {showApiKeyInput || !apiKey ? (
            <div className="space-y-2">
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Enter API Key"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setApiKey(newApiKey);
                    setShowApiKeyInput(false);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                >
                  Save
                </button>
                {apiKey && (
                  <button
                    onClick={() => setShowApiKeyInput(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-400 tabular-nums">
                  ••••••••{apiKey.slice(-4)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setNewApiKey(apiKey);
                      setShowApiKeyInput(true);
                    }}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 px-1"
                  >
                    Change
                  </button>
                  <button
                    onClick={() => setApiKey("")}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 px-1"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
