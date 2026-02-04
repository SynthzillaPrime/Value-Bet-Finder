import React from 'react';
import { LEAGUES } from '../constants';

interface Props {
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled: boolean;
}

export const LeagueSelector: React.FC<Props> = ({ selected, onChange, disabled }) => {
  
  const toggleLeague = (key: string) => {
    if (selected.includes(key)) {
      if (selected.length === 1) return; // Prevent unselecting all
      onChange(selected.filter(k => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const toggleAll = () => {
    if (selected.length === LEAGUES.length) {
        // Keep at least one selected or maybe select top 3? Let's just keep EPL
        onChange(['soccer_epl']);
    } else {
        onChange(LEAGUES.map(l => l.key));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        onClick={toggleAll}
        disabled={disabled}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            selected.length === LEAGUES.length 
            ? 'bg-slate-200 text-slate-900 border-white' 
            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
        }`}
      >
        All
      </button>
      {LEAGUES.map(league => {
        const isSelected = selected.includes(league.key);
        return (
          <button
            key={league.key}
            onClick={() => toggleLeague(league.key)}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isSelected
                ? 'bg-blue-600/20 text-blue-200 border-blue-500/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {league.name}
          </button>
        );
      })}
    </div>
  );
};