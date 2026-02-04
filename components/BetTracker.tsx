import React, { useState } from 'react';
import { TrackedBet } from '../types';
import { fetchClosingLineForBet } from '../services/edgeFinder';
import { AnalysisDashboard } from './AnalysisDashboard';
import { RefreshCw, Trash2, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface Props {
  bets: TrackedBet[];
  apiKey: string;
  onUpdateBet: (bet: TrackedBet) => void;
  onDeleteBet: (id: string) => void;
}

export const BetTracker: React.FC<Props> = ({ bets, apiKey, onUpdateBet, onDeleteBet }) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const checkClosingLine = async (bet: TrackedBet) => {
    if (new Date() < new Date(bet.kickoff)) {
        alert("Match hasn't started yet. Closing line is only available after kickoff.");
        return;
    }

    setLoadingId(bet.id);
    const result = await fetchClosingLineForBet(apiKey, bet);
    setLoadingId(null);

    if (result) {
        // CLV Calculation: (MyOdds / ClosingFairPrice - 1) * 100
        const clv = ((bet.exchangePrice / result.fairPrice) - 1) * 100;
        
        onUpdateBet({
            ...bet,
            closingRawPrice: result.rawPrice,
            closingFairPrice: result.fairPrice,
            clvPercent: clv,
            status: 'closed'
        });
    } else {
        alert("Could not find closing line in history. It might be too early, or data is unavailable on your plan.");
    }
  };

  const sortedBets = [...bets].sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

  // Formatting helper for "Time Placed"
  const formatTimePlaced = (bet: TrackedBet) => {
      const hoursBefore = (new Date(bet.kickoff).getTime() - bet.placedAt) / (1000 * 60 * 60);
      if (hoursBefore > 48) return `${Math.floor(hoursBefore / 24)} days out`;
      if (hoursBefore > 24) return `1 day out`;
      if (hoursBefore > 1) return `${Math.floor(hoursBefore)}h out`;
      return `<1h out`;
  };

  if (bets.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <p>You haven't tracked any bets yet.</p>
            <p className="text-sm">Click "Track Bet" on the scanner to add them here.</p>
        </div>
    )
  }

  return (
    <div className="space-y-8">
      
      {/* 1. Analytics Section */}
      <AnalysisDashboard bets={bets} />

      {/* 2. Table Section */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            Bet History
            <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                {bets.length}
            </span>
        </h3>
        
        <div className="overflow-x-auto bg-slate-800/50 rounded-xl border border-slate-700/50">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Event</th>
                <th className="p-4 font-medium">Selection</th>
                <th className="p-4 font-medium text-right">Timing</th>
                <th className="p-4 font-medium text-right">My Odds</th>
                <th className="p-4 font-medium text-right">Close (Fair)</th>
                <th className="p-4 font-medium text-right">CLV %</th>
                <th className="p-4 font-medium text-right">Action</th>
                </tr>
            </thead>
            <tbody className="text-sm">
                {sortedBets.map(bet => {
                const hasStarted = new Date() > new Date(bet.kickoff);
                const clvColor = (bet.clvPercent || 0) > 0 ? 'text-emerald-400' : 'text-red-400';
                
                return (
                    <tr key={bet.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4">
                        <div className="font-semibold text-slate-200">{bet.homeTeam} <span className="text-slate-500 font-normal">vs</span> {bet.awayTeam}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                        {new Date(bet.kickoff).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </td>
                    <td className="p-4 text-slate-300">
                        <span className="bg-slate-700/50 px-2 py-1 rounded text-slate-200">{bet.selection}</span>
                        <div className="text-xs text-slate-500 mt-1">{bet.market}</div>
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-slate-400" title={new Date(bet.placedAt).toLocaleString()}>
                            <Clock className="w-3 h-3" />
                            {formatTimePlaced(bet)}
                        </div>
                    </td>
                    <td className="p-4 text-right">
                        <div className="font-mono text-blue-300 font-bold text-base">
                           {bet.exchangePrice.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">{bet.exchangeName}</div>
                    </td>
                    <td className="p-4 text-right">
                        {bet.closingFairPrice ? (
                            <div className="flex flex-col items-end">
                                <span className="font-mono text-slate-300 font-medium">{bet.closingFairPrice.toFixed(2)}</span>
                                <span className="text-[10px] text-slate-500">True Odds</span>
                            </div>
                        ) : (
                            <span className="text-slate-600">-</span>
                        )}
                    </td>
                    <td className="p-4 text-right font-bold">
                        {bet.clvPercent !== undefined ? (
                            <div className={`flex items-center justify-end gap-1 ${clvColor}`}>
                                {bet.clvPercent > 0 ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}
                                {bet.clvPercent > 0 ? '+' : ''}{bet.clvPercent.toFixed(2)}%
                            </div>
                        ) : (
                            <span className="text-slate-600 text-xs">-</span>
                        )}
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            {bet.status === 'open' && (
                                <button 
                                    onClick={() => checkClosingLine(bet)}
                                    disabled={!hasStarted || loadingId === bet.id}
                                    className={`p-2 rounded hover:bg-slate-700 transition-colors ${!hasStarted ? 'opacity-30 cursor-not-allowed' : 'text-blue-400'}`}
                                    title={!hasStarted ? "Wait for kickoff" : "Calculate CLV"}
                                >
                                    <RefreshCw className={`w-4 h-4 ${loadingId === bet.id ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                            <button 
                                onClick={() => onDeleteBet(bet.id)}
                                className="p-2 rounded hover:bg-red-900/20 text-slate-600 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};