import React from "react";
import { TrackedBet } from "../../types";

interface MobileHistoryProps {
  bets: TrackedBet[];
  onDeleteBet: (id: string) => Promise<void>;
}

/**
 * MobileHistory Placeholder
 * Matches props of BetHistoryView for future implementation.
 */
export const MobileHistory: React.FC<MobileHistoryProps> = ({
  // Props accepted but currently unused as per instructions
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div>Mobile History — coming soon</div>
    </div>
  );
};
