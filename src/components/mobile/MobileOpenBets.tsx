import React from "react";
import { TrackedBet } from "../../types";

interface MobileOpenBetsProps {
  bets: TrackedBet[];
  onDeleteBet: (id: string) => Promise<void>;
  onSettleBet: (
    betId: string,
    forceResult?: "won" | "lost" | "void",
  ) => Promise<"settled" | "skipped" | "failed">;
  onSettleAll: () => Promise<{
    settled: number;
    skipped: number;
    failed: number;
  }>;
}

/**
 * MobileOpenBets Placeholder
 * Matches props of OpenBetsView for future implementation.
 */
export const MobileOpenBets: React.FC<MobileOpenBetsProps> = (
  {
    // Props accepted but currently unused as per instructions
  },
) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div>Mobile Open Bets — coming soon</div>
    </div>
  );
};
