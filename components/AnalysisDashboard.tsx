import React from 'react';
import { TrackedBet } from '../types';
import { TrendingUp, Clock, Target, Award, AlertCircle } from 'lucide-react';

interface Props {
  bets: TrackedBet[];
}

interface LeagueStat {
    name: string;
    count: number;
    avgRawEdge: number;
    avgClv: number;
    beatCloseRate: number;
    closedCount: number;
}

export const AnalysisDashboard: React.FC<Props> = ({ bets }) => {
  const closedBets = bets.filter(b => b.status === 'closed' && b.clvPercent !== undefined);

  if (bets.length === 0) return null;

  // --- Aggregate Stats ---
  const totalClosed = closedBets.length;
  const avgClv = totalClosed > 0 
    ? closedBets.reduce((acc, b) => acc + (b.clvPercent || 0), 0) / totalClosed
    : 0;
  
  const positiveClvCount = closedBets.filter(b => (b.clvPercent || 0) > 0).length;
  const beatCloseRate = totalClosed > 0 
    ? (positiveClvCount / totalClosed) * 100 
    : 0;

  // --- League Breakdown ---
  const leagueStatsMap: Record<string, TrackedBet[]> = {};
  bets.forEach(b => {
      if (!leagueStatsMap[b.sport]) leagueStatsMap[b.sport] = [];
      leagueStatsMap[b.sport].push(b);
  });

  const leagueTable: LeagueStat[] = Object.entries(leagueStatsMap).map(([name, leagueBets]) => {
      const closed = leagueBets.filter(b => b.status === 'closed');
      const avgRaw = leagueBets.reduce((sum, b) => sum + b.edgePercent, 0) / leagueBets.length;
      
      const lAvgClv = closed.length > 0 ? closed.reduce((sum, b) => sum + (b.clvPercent || 0), 0) / closed.length : 0;
      const lBeatClose = closed.length > 0 ? closed.filter(b => (b.clvPercent || 0) > 0).length / closed.length : 0;

      return {
          name,
          count: leagueBets.length,
          avgRawEdge: avgRaw,
          avgClv: lAvgClv,
          beatCloseRate: lBeatClose * 100,
          closedCount: closed.length
      };
  }).sort((a, b) => b.count - a.count); // Sort by volume

  // --- Insights ---
  const leaguesWithData = leagueTable.filter(l => l.closedCount >= 1); // Low threshold for demo
  const bestLeague = [...leaguesWithData].sort((a, b) => b.avgClv - a.avgClv)[0];
  const worstLeague = [...leaguesWithData].sort((a, b) => a.avgClv - b.avgClv)[0];

  // --- Scatter Plot Helper ---
  // X Axis: Hours Before Kickoff (Reverse, Right is 0)
  // Y Axis: CLV %
  const plotData = closedBets.map(bet => ({
    x: (new Date(bet.kickoff).getTime() - bet.placedAt) / (1000 * 60 * 60), // Hours
    y: bet.clvPercent || 0
  }));

  const maxY = Math.max(...plotData.map(d => Math.abs(d.y)), 10) + 2; // Dynamic range
  const maxX = Math.max(...plotData.map(d => d.x), 24) + 12; // At least 24h view

  return (
    <div className="space-y-6 mb-8">
        
        {/* Top Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Bets Analyzed</p>
                    <p className="text-2xl font-bold text-white">{totalClosed} <span className="text-slate-500 text-sm font-normal">/ {bets.length}</span></p>
                </div>
            </div>
            
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                <div className={`p-3 rounded-full ${avgClv > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Average CLV</p>
                    <p className={`text-2xl font-bold ${avgClv > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {avgClv > 0 ? '+' : ''}{avgClv.toFixed(2)}%
                    </p>
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                    <Clock className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">Beat The Close</p>
                    <p className="text-2xl font-bold text-white">{beatCloseRate.toFixed(1)}%</p>
                </div>
            </div>
        </div>

        {/* Insights Section */}
        {totalClosed > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bestLeague && bestLeague.avgClv > 0 && (
                    <div className="bg-gradient-to-r from-slate-800 to-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl flex items-start gap-3">
                         <Award className="w-5 h-5 text-emerald-400 mt-0.5" />
                         <div>
                             <h4 className="text-emerald-300 font-semibold text-sm">Best Performing League</h4>
                             <p className="text-slate-300 text-sm mt-1">
                                 <span className="font-bold text-white">{bestLeague.name}</span> is generating 
                                 <span className="text-emerald-400 font-bold ml-1">+{bestLeague.avgClv.toFixed(1)}% CLV</span> on average.
                             </p>
                         </div>
                    </div>
                )}
                {worstLeague && worstLeague.avgClv < 0 && (
                    <div className="bg-gradient-to-r from-slate-800 to-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                         <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                         <div>
                             <h4 className="text-red-300 font-semibold text-sm">Underperforming League</h4>
                             <p className="text-slate-300 text-sm mt-1">
                                 <span className="font-bold text-white">{worstLeague.name}</span> is averaging 
                                 <span className="text-red-400 font-bold ml-1">{worstLeague.avgClv.toFixed(1)}% CLV</span>. Consider avoiding.
                             </p>
                         </div>
                    </div>
                )}
            </div>
        )}

        {/* Main Grid: League Table & Scatter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* League Performance Table */}
            <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-200 text-sm">Performance by League</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-xs text-slate-500 uppercase bg-slate-900/30">
                                <th className="px-4 py-3 font-medium">League</th>
                                <th className="px-4 py-3 font-medium text-right">Bets</th>
                                <th className="px-4 py-3 font-medium text-right">Avg Edge (Raw)</th>
                                <th className="px-4 py-3 font-medium text-right">Avg CLV</th>
                                <th className="px-4 py-3 font-medium text-right">Beat Close</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {leagueTable.map((l) => (
                                <tr key={l.name} className="hover:bg-slate-700/20">
                                    <td className="px-4 py-3 font-medium text-slate-200">{l.name}</td>
                                    <td className="px-4 py-3 text-right text-slate-400">{l.count}</td>
                                    <td className="px-4 py-3 text-right text-slate-300">+{l.avgRawEdge.toFixed(1)}%</td>
                                    <td className={`px-4 py-3 text-right font-bold ${l.closedCount === 0 ? 'text-slate-600' : l.avgClv > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {l.closedCount > 0 ? `${l.avgClv > 0 ? '+' : ''}${l.avgClv.toFixed(1)}%` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-300">
                                        {l.closedCount > 0 ? `${l.beatCloseRate.toFixed(0)}%` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Scatter Plot */}
            <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-4 relative flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-200 text-sm">CLV vs Time</h3>
                    <span className="text-xs text-slate-500">Kickoff →</span>
                </div>
                
                {plotData.length > 0 ? (
                    <div className="h-[200px] w-full relative border-l border-b border-slate-600/50 flex-grow">
                        {/* Zero Line */}
                        <div className="absolute left-0 right-0 border-t border-slate-600/30 border-dashed" style={{ top: '50%' }}></div>

                        {plotData.map((pt, i) => {
                            // Normalize coords
                            // X: 0 is right (kickoff), maxX is left
                            const left = ((maxX - pt.x) / maxX) * 100;
                            
                            // Y: 0 is center (50%)
                            // We map -maxY to +maxY
                            const top = 50 - (pt.y / maxY) * 50;

                            return (
                                <div 
                                    key={i}
                                    className={`absolute w-2 h-2 rounded-full border border-slate-900 shadow-sm ${pt.y > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                                    style={{ 
                                        left: `${Math.max(0, Math.min(100, left))}%`, 
                                        top: `${Math.max(0, Math.min(100, top))}%`,
                                        transform: 'translate(-50%, -50%)'
                                    }}
                                    title={`Placed ${pt.x.toFixed(1)}h before kickoff. CLV: ${pt.y.toFixed(2)}%`}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-[200px] flex items-center justify-center text-slate-600 text-xs">
                        No closed bets yet
                    </div>
                )}
                <div className="mt-2 text-[10px] text-slate-500 text-center">Bets placed closer to kickoff are on the right</div>
            </div>
        </div>
    </div>
  );
};