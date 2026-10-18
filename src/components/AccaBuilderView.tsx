import React, { useState, useMemo, useEffect } from "react";
import { MatchResponse, AccaLegCandidate, PaperAcca } from "../types";
import { BETFRED_ACCA_FLEX, CURRENT_SEASON } from "../constants";
import {
  buildLegCandidates,
  suggestAcca,
  estimateAcca,
  fetchScoresBySport,
  settleAcca,
} from "../services/accaBuilder";
import {
  fetchPaperAccas,
  insertPaperAcca,
  updatePaperAcca,
} from "../services/supabase";
import { Info, AlertTriangle, Check, X, RefreshCw, Save } from "lucide-react";

interface AccaBuilderViewProps {
  rawMatches: MatchResponse[];
  lastUpdated: Date | null;
  apiKey: string | null;
}

const AccaBuilderView: React.FC<AccaBuilderViewProps> = ({
  rawMatches,
  lastUpdated,
  apiKey,
}) => {
  const [targetDate, setTargetDate] = useState<"today" | "tomorrow">("today");
  const [selectedLegIds, setSelectedLegIds] = useState<Set<string>>(new Set());
  const [legOdds, setLegOdds] = useState<Record<string, number>>({});
  const [stake, setStake] = useState<number>(BETFRED_ACCA_FLEX.defaultStake);
  const [history, setHistory] = useState<PaperAcca[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [logStatus, setLogStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [settleStatus, setSettleStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [sortField, setSortField] = useState<"kickoff" | "fair" | "refPrice" | "value">("value");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (field: "kickoff" | "fair" | "refPrice" | "value") => {
    if (field === sortField) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "kickoff" ? "asc" : "desc");
    }
  };

  useEffect(() => {
    if (logStatus?.type === "success") {
      const timer = setTimeout(() => setLogStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [logStatus]);

  useEffect(() => {
    if (settleStatus?.type === "success") {
      const timer = setTimeout(() => setSettleStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [settleStatus]);

  const loadHistory = async () => {
    try {
      const data = await fetchPaperAccas();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load acca history", err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const activeDate = useMemo(() => {
    const d = new Date();
    if (targetDate === "tomorrow") {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }, [targetDate]);

  const candidates = useMemo(() => {
    if (!rawMatches.length) return [];
    return buildLegCandidates(rawMatches, activeDate);
  }, [rawMatches, activeDate]);

  const sortedCandidates = useMemo(() => {
    const list = [...candidates];
    list.sort((a, b) => {
      let valA: number;
      let valB: number;

      switch (sortField) {
        case "kickoff":
          valA = a.kickoff.getTime();
          valB = b.kickoff.getTime();
          break;
        case "fair":
          valA = a.pinnacleFair;
          valB = b.pinnacleFair;
          break;
        case "refPrice":
          valA = a.refPrice ?? 0;
          valB = b.refPrice ?? 0;
          break;
        case "value":
        default:
          valA = a.valueRatio ?? 0;
          valB = b.valueRatio ?? 0;
          break;
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [candidates, sortField, sortDir]);

  // Pre-tick suggested acca when candidates change or date changes
  useEffect(() => {
    const suggested = suggestAcca(candidates, BETFRED_ACCA_FLEX.minLegs);
    const ids = new Set(suggested.map((c) => c.id));
    setSelectedLegIds(ids);

    // Initialise odds
    const initialOdds: Record<string, number> = {};
    suggested.forEach((c) => {
      initialOdds[c.id] = c.refPrice ?? c.pinnacleFair;
    });
    setLegOdds(initialOdds);
  }, [candidates]);

  const toggleLeg = (cand: AccaLegCandidate) => {
    const newIds = new Set(selectedLegIds);
    if (newIds.has(cand.id)) {
      newIds.delete(cand.id);
    } else {
      newIds.add(cand.id);
      if (!legOdds[cand.id]) {
        setLegOdds((prev) => ({
          ...prev,
          [cand.id]: cand.refPrice ?? cand.pinnacleFair,
        }));
      }
    }
    setSelectedLegIds(newIds);
  };

  const updateOdds = (id: string, value: string) => {
    const num = parseFloat(value);
    setLegOdds((prev) => ({ ...prev, [id]: isNaN(num) ? 0 : num }));
  };

  const selectedLegs = useMemo(() => {
    return candidates.filter((c) => selectedLegIds.has(c.id));
  }, [candidates, selectedLegIds]);

  const estimate = useMemo(() => {
    if (selectedLegs.length === 0) return null;
    const legs = selectedLegs.map((l) => ({
      prob: l.pinnacleProb,
      odds: legOdds[l.id] || 1.0,
    }));
    return estimateAcca(legs, stake, BETFRED_ACCA_FLEX);
  }, [selectedLegs, legOdds, stake]);

  const handleLogAcca = async () => {
    if (!estimate || selectedLegs.length === 0) return;
    setIsLogging(true);
    setLogStatus(null);
    try {
      const earliestKickoff = new Date(
        Math.min(...selectedLegs.map((l) => l.kickoff.getTime())),
      );

      const bonusLadder = BETFRED_ACCA_FLEX.bonusByLegs;
      const legKeys = Object.keys(bonusLadder).map(Number).sort((a, b) => b - a);
      const maxLegsInTable = legKeys[0];
      const bonusRate =
        selectedLegs.length >= maxLegsInTable
          ? bonusLadder[maxLegsInTable]
          : bonusLadder[selectedLegs.length] || 0;

      const newAcca: PaperAcca = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        season: CURRENT_SEASON,
        bookmaker: "Betfred",
        offerType: "insurance",
        offerTerms: {
          bonusRate,
          description: `Insurance if 1 leg loses. ${
            bonusRate > 0 ? (bonusRate * 100).toFixed(0) + "% bonus on wins." : ""
          }`,
        },
        refundCap: BETFRED_ACCA_FLEX.refundCap,
        stake: stake,
        legs: selectedLegs.map((l) => ({
          selection: l.selection,
          match: `${l.homeTeam} vs ${l.awayTeam}`,
          homeTeam: l.homeTeam,
          awayTeam: l.awayTeam,
          sportKey: l.sportKey,
          kickoff: l.kickoff,
          odds: legOdds[l.id] || 0,
          refPrice: l.refPrice,
          pinnacleFair: l.pinnacleFair,
          valueRatio: l.valueRatio,
          result: null,
        })),
        numLegs: selectedLegs.length,
        combinedOdds: estimate.combinedOdds,
        firstKickoff: earliestKickoff,
        status: "open",
        returns: null,
        freeBetFace: null,
        freeBetValue: null,
        netPl: null,
        notes: null,
        source: "builder",
        estEv: estimate.evPercent,
        estPWin: estimate.probAllWin * 100,
        estPRefund: estimate.probExactlyOneLoses * 100,
      };

      await insertPaperAcca(newAcca);
      await loadHistory();
      // Reset selection
      setSelectedLegIds(new Set());
      setLogStatus({ type: "success", message: "Acca logged successfully!" });
    } catch (err) {
      console.error("Failed to log acca", err);
      setLogStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to log acca",
      });
    } finally {
      setIsLogging(false);
    }
  };

  const handleSettleAccas = async () => {
    if (!apiKey) return;
    const openAccas = history.filter((a) => a.status === "open");
    if (openAccas.length === 0) return;

    setIsSettling(true);
    setSettleStatus(null);
    try {
      // Group sports
      const sportKeys = new Set<string>();
      openAccas.forEach((acca) => {
        acca.legs.forEach((leg) => {
          if (leg.sportKey) sportKeys.add(leg.sportKey);
        });
      });

      const scoresBySport: Record<string, MatchResponse[]> = {};
      for (const sportKey of Array.from(sportKeys)) {
        const scores = await fetchScoresBySport(apiKey, sportKey);
        scoresBySport[sportKey] = scores;
      }

      for (const acca of openAccas) {
        const { updatedAcca, changed } = settleAcca(acca, scoresBySport);
        if (changed) {
          await updatePaperAcca(updatedAcca.id, updatedAcca);
        }
      }

      await loadHistory();
      setSettleStatus({ type: "success", message: "Accas settled successfully!" });
    } catch (err) {
      console.error("Settlement failed", err);
      setSettleStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Settlement failed",
      });
    } finally {
      setIsSettling(false);
    }
  };

  const stats = useMemo(() => {
    const totalStaked = history.reduce((sum, a) => sum + a.stake, 0);
    const totalPl = history.reduce((sum, a) => sum + (a.netPl || 0), 0);
    const avgEv =
      history.length > 0
        ? history.reduce((sum, a) => sum + (a.estEv || 0), 0) / history.length
        : 0;
    const roi = totalStaked > 0 ? (totalPl / totalStaked) * 100 : 0;

    return {
      count: history.length,
      totalStaked,
      totalPl,
      avgEv,
      roi,
    };
  }, [history]);

  const warnings = [];
  if (selectedLegs.length < BETFRED_ACCA_FLEX.minLegs) {
    warnings.push(`Minimum ${BETFRED_ACCA_FLEX.minLegs} legs required for insurance.`);
  }
  const lowOddsLegs = selectedLegs.filter((l) => (legOdds[l.id] || 0) < BETFRED_ACCA_FLEX.minLegOdds);
  if (lowOddsLegs.length > 0) {
    warnings.push(`One or more legs have odds below ${BETFRED_ACCA_FLEX.minLegOdds}.`);
  }

  return (
    <div className="space-y-6">
      {(!lastUpdated || rawMatches.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-800/50">
          <RefreshCw className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium text-lg">
            No scan data available.
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Run a scan in the Scanner tab first to fetch latest odds.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2 rounded-lg">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">
              Prices from scan at {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-slate-500">
              Rescan in the Scanner for latest market moves.
            </p>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setTargetDate("today")}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              targetDate === "today"
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTargetDate("tomorrow")}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              targetDate === "tomorrow"
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Tomorrow
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidates Table */}
        <div className="lg:col-span-2 bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800/50">
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-10"></th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">Match</th>
                  <th 
                    onClick={() => handleSort("kickoff")}
                    className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Kickoff
                      {sortField === "kickoff" && (
                        <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">Selection</th>
                  <th 
                    onClick={() => handleSort("fair")}
                    className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Fair
                      {sortField === "fair" && (
                        <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("refPrice")}
                    className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Ref Price
                      {sortField === "refPrice" && (
                        <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("value")}
                    className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:text-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Value
                      {sortField === "value" && (
                        <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {sortedCandidates.map((cand) => (
                  <tr
                    key={cand.id}
                    onClick={() => toggleLeg(cand)}
                    className={`group hover:bg-slate-800/30 cursor-pointer transition-colors ${
                      selectedLegIds.has(cand.id) ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selectedLegIds.has(cand.id) 
                          ? "bg-emerald-500 border-emerald-500" 
                          : "border-slate-700 group-hover:border-slate-500"
                      }`}>
                        {selectedLegIds.has(cand.id) && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-white leading-tight">
                        {cand.homeTeam}
                        <span className="block text-[10px] text-slate-500 font-medium">vs {cand.awayTeam}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[10px] font-bold text-slate-400">
                        {cand.kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-tight">
                        {cand.selection}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {cand.pinnacleFair.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-mono font-black text-white">
                          {cand.refPrice?.toFixed(2) || "-"}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">
                          {cand.refBookmaker || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cand.valueRatio !== null ? (
                        <span className={`text-xs font-mono font-black ${
                          cand.valueRatio > 1 ? "text-emerald-400" : "text-slate-500"
                        }`}>
                          {((cand.valueRatio - 1) * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm italic">
                      No suitable legs found for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Legs & Live Estimate */}
        <div className="space-y-6">
          {/* Selected Panel */}
          <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-5 backdrop-blur-sm shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              Selected Legs
              <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                {selectedLegs.length}
              </span>
            </h3>
            
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {selectedLegs.map((l) => (
                <div key={l.id} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-emerald-400 uppercase truncate">
                      {l.selection}
                    </p>
                    <p className="text-[9px] text-slate-500 font-bold truncate">
                      {l.homeTeam} v {l.awayTeam}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-black uppercase">Odds</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={legOdds[l.id] || ""}
                      onChange={(e) => updateOdds(l.id, e.target.value)}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-xs font-mono font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button 
                      onClick={() => toggleLeg(l)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {selectedLegs.length === 0 && (
                <p className="text-center py-4 text-[11px] text-slate-500 italic">
                  Select legs from the table to build your acca.
                </p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Stake</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">£</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={stake}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === ".") {
                        setStake(0);
                      } else {
                        const num = parseFloat(val);
                        setStake(isNaN(num) ? 0 : num);
                      }
                    }}
                    className="w-24 bg-slate-950 border border-slate-700 rounded-lg py-2 pl-6 pr-3 text-sm font-mono font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Estimate Panel */}
          {estimate && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <RefreshCw className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Live Estimate</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Combined Odds</p>
                  <p className="text-xl font-mono font-black text-white">{estimate.combinedOdds.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">EV %</p>
                  <p className={`text-xl font-mono font-black ${estimate.evPercent > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {estimate.evPercent > 0 ? "+" : ""}{estimate.evPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">Chance all win</span>
                  <span className="text-slate-200 font-mono font-bold">{(estimate.probAllWin * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">Chance of refund</span>
                  <span className="text-slate-200 font-mono font-bold">{(estimate.probExactlyOneLoses * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400 font-medium">Expected Return</span>
                  <span className="text-slate-200 font-mono font-bold">£{estimate.expectedReturn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-black uppercase">Expected Profit</span>
                  <span className={`font-mono font-black text-sm ${estimate.expectedProfit > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {estimate.expectedProfit > 0 ? "+" : ""}£{estimate.expectedProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Warnings & Reminders */}
              <div className="space-y-2">
                {warnings.map((w, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-200/80 font-bold leading-tight">{w}</p>
                  </div>
                ))}
                <div className="flex items-start gap-2 bg-slate-800/50 p-2 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-medium leading-tight">
                    Only the first accumulator placed each day is eligible for Betfred Acca Flex insurance.
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogAcca}
                disabled={isLogging || selectedLegs.length === 0}
                className="w-full mt-6 py-3 bg-emerald-500 text-slate-950 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLogging ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Log Paper Acca
              </button>

              {logStatus && (
                <div
                  className={`mt-3 text-center text-xs font-bold ${
                    logStatus.type === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {logStatus.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        </>
      )}

      {/* History Section */}
      <div className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white tracking-tight">Acca History</h2>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSettleAccas}
              disabled={isSettling || !apiKey}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSettling ? "animate-spin" : ""}`} />
              Settle Open Accas
            </button>
            {settleStatus && (
              <span
                className={`text-[10px] font-bold ${
                  settleStatus.type === "success" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {settleStatus.message}
              </span>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Accas</p>
            <p className="text-lg font-mono font-black text-white">{stats.count}</p>
          </div>
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Total Staked</p>
            <p className="text-lg font-mono font-black text-white">£{stats.totalStaked.toFixed(2)}</p>
          </div>
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Net P/L</p>
            <p className={`text-lg font-mono font-black ${stats.totalPl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.totalPl >= 0 ? "+" : ""}£{stats.totalPl.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">ROI</p>
            <p className={`text-lg font-mono font-black ${stats.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.roi >= 0 ? "+" : ""}{stats.roi.toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Avg Est. EV</p>
            <p className="text-lg font-mono font-black text-blue-400">{stats.avgEv.toFixed(1)}%</p>
          </div>
        </div>

        {/* History Table */}
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Legs</th>
                  <th className="px-6 py-4 text-right">Odds</th>
                  <th className="px-6 py-4 text-right">Stake</th>
                  <th className="px-6 py-4 text-right">Est. EV</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Net P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {history.map((acca) => (
                  <tr key={acca.id} className="text-xs font-medium text-slate-300 hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      {new Date(acca.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">{acca.numLegs}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {acca.combinedOdds.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      £{acca.stake.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-blue-400">
                      {acca.estEv?.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                        acca.status === "open" ? "bg-blue-500/10 text-blue-400" :
                        acca.netPl! > 0 ? "bg-emerald-500/10 text-emerald-400" :
                        acca.netPl! === 0 ? "bg-slate-500/10 text-slate-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {acca.status === "open" ? "Open" : 
                         acca.netPl! > 0 ? "Won" :
                         acca.netPl! === 0 ? "Refunded" : "Lost"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                      {acca.netPl !== null ? (
                        <span className={acca.netPl >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {acca.netPl >= 0 ? "+" : ""}£{acca.netPl.toFixed(2)}
                        </span>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                      No logged accumulators.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccaBuilderView;
