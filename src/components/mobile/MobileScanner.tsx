import React from "react";
import { TrackedBet, BetEdge } from "../../types";

interface MobileScannerProps {
  bets: BetEdge[];
  trackedBets: TrackedBet[];
  bankroll: number;
  expandedBetId: string | null;
  setExpandedBetId: (id: string | null) => void;
  localSelectedExchangeKey: string | null;
  setLocalSelectedExchangeKey: (key: string | null) => void;
  isTracking: boolean;
  customCommission: string;
  setCustomCommission: (val: string) => void;
  handleCommissionSelect: (bet: BetEdge, commission: number) => void;
}

/**
 * MobileScanner Placeholder
 * Matches props of ScannerTable for future implementation.
 */
export const MobileScanner: React.FC<MobileScannerProps> = (
  {
    // Props accepted but currently unused as per instructions
  },
) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div>Mobile Scanner — coming soon</div>
    </div>
  );
};
