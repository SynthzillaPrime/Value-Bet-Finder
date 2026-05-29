import { findArbitrageOpportunities } from "./arbFinder";
import { MatchResponse, Bookmaker } from "../types";

/**
 * MOCK DATA GENERATOR
 */
const createMockMatch = (
  id: string,
  commence_time: string,
  outcomes1: { name: string; price: number }[], // Matchbook outcomes
  outcomes2: { name: string; price: number }[], // Smarkets outcomes
  includeMB = true,
  includeSM = true
): MatchResponse => {
  const bookmakers: Bookmaker[] = [];

  if (includeMB) {
    bookmakers.push({
      key: "matchbook",
      title: "Matchbook",
      last_update: new Date().toISOString(),
      markets: [{ key: "h2h", last_update: new Date().toISOString(), outcomes: outcomes1 }],
    });
  }

  if (includeSM) {
    bookmakers.push({
      key: "smarkets",
      title: "Smarkets",
      last_update: new Date().toISOString(),
      markets: [{ key: "h2h", last_update: new Date().toISOString(), outcomes: outcomes2 }],
    });
  }

  return {
    id,
    sport_key: "tennis_atp",
    sport_title: "Tennis",
    commence_time,
    home_team: "Player A",
    away_team: "Player B",
    bookmakers,
  };
};

/**
 * TEST RUNNER
 */
const runTests = () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();

  console.log("--- ARBITRAGE FINDER TEST HARNESS ---\n");

  // 1. Clear Back/Back Arb
  // Player A: 2.10 (MB), Player B: 2.10 (SM)
  // Net Return: 1 + (1.1 * 0.98) = 2.078
  // Net Implied: 1 / 2.078 = 0.48123...
  // Sum Implied: 0.96246... (Arb! ~3.75%)
  const case1 = createMockMatch("case1", future,
    [{ name: "Player A", price: 2.1 }, { name: "Player B", price: 1.8 }],
    [{ name: "Player A", price: 1.8 }, { name: "Player B", price: 2.1 }]
  );

  // 2. No Arb
  // Prices 1.9/1.9
  const case2 = createMockMatch("case2", future,
    [{ name: "Player A", price: 1.9 }, { name: "Player B", price: 1.9 }],
    [{ name: "Player A", price: 1.9 }, { name: "Player B", price: 1.9 }]
  );

  // 3. Borderline (<0.5%)
  // Sum implied should be e.g. 0.997 (0.3% arb)
  // Net return 2.015 -> Net implied 0.4962 -> Total 0.9924 -> 0.76% (Actually this is >0.5)
  // Let's use 2.03 vs 2.03: 1+(1.03*0.98) = 2.0094. Implied = 0.4976. Total = 0.9953. Arb = 0.47%.
  const case3 = createMockMatch("case3", future,
    [{ name: "Player A", price: 2.03 }, { name: "Player B", price: 1.8 }],
    [{ name: "Player A", price: 1.8 }, { name: "Player B", price: 2.03 }]
  );

  // 4. Past event (Arb prices but in-play)
  const case4 = createMockMatch("case4", past,
    [{ name: "Player A", price: 2.1 }, { name: "Player B", price: 2.1 }],
    [{ name: "Player A", price: 2.1 }, { name: "Player B", price: 2.1 }]
  );

  // 5. One exchange only
  const case5 = createMockMatch("case5", future,
    [{ name: "Player A", price: 2.1 }, { name: "Player B", price: 2.1 }],
    [], false, true
  );

  const results = findArbitrageOpportunities([case1, case2, case3, case4, case5]);

  console.log("TEST 1: Clear 2-way Arb (2.1 vs 2.1)");
  const res1 = results.find(r => r.id === "arb-case1");
  console.log(`Expected: Flagged, Arb % ~3.75%`);
  console.log(`Actual: ${res1 ? `Flagged, ${res1.arbPercentage}%, Stakes: ${res1.legs[0].recommendedStake.toFixed(2)} / ${res1.legs[1].recommendedStake.toFixed(2)}` : "Not Flagged"}`);
  console.log("");

  console.log("TEST 2: No Arb (1.9 vs 1.9)");
  const res2 = results.find(r => r.id === "arb-case2");
  console.log(`Expected: Not Flagged`);
  console.log(`Actual: ${res2 ? "Flagged" : "Not Flagged"}`);
  console.log("");

  console.log("TEST 3: Borderline Arb (~0.47%)");
  const res3 = results.find(r => r.id === "arb-case3");
  console.log(`Expected: Not Flagged (Threshold 0.5%)`);
  console.log(`Actual: ${res3 ? "Flagged" : "Not Flagged"}`);
  console.log("");

  console.log("TEST 4: Past Event (Arb prices)");
  const res4 = results.find(r => r.id === "arb-case4");
  console.log(`Expected: Not Flagged (Pre-match only)`);
  console.log(`Actual: ${res4 ? "Flagged" : "Not Flagged"}`);
  console.log("");

  console.log("TEST 5: Single Exchange");
  const res5 = results.find(r => r.id === "arb-case5");
  console.log(`Expected: Not Flagged`);
  console.log(`Actual: ${res5 ? "Flagged" : "Not Flagged"}`);
  console.log("");

  console.log("--- BACK/LAY CHECK ---");
  console.log("Status: The TODO guard is active, so no back-lay arbs are expected.");
  const backLay = results.filter(r => r.arbType === "back-lay");
  console.log(`Back-Lay found: ${backLay.length}`);
};

// Run the script
runTests();
