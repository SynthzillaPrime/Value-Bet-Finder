
/*
  Exchange Match Result markets settle on 90 minutes, but The Odds API returns the final score including extra time.
*/

export type RegulationOutcome = "regulation" | "beyond_90" | "unknown";

export interface RegulationQuery {
  sportKey: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date | string | number;
}

const ESPN_SLUGS: { [key: string]: string } = {
  soccer_fa_cup: "eng.fa",
};

const normalize = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[\W_]/g, "")
    .replace(/fc$/, "")
    .replace(/afc$/, "")
    .trim();
};

const teamsMatch = (team1: string, team2: string): boolean => {
  const normalized1 = normalize(team1);
  const normalized2 = normalize(team2);
  return (
    normalized1 === normalized2 ||
    normalized1.includes(normalized2) ||
    normalized2.includes(normalized1)
  );
};

export const needsRegulationCheck = (sportKey: string): boolean => {
  return sportKey in ESPN_SLUGS;
};

export const getRegulationOutcome = async (
  q: RegulationQuery
): Promise<RegulationOutcome> => {
  if (!needsRegulationCheck(q.sportKey)) {
    return "regulation";
  }

  const slug = ESPN_SLUGS[q.sportKey];
  const date = new Date(q.kickoff);
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const formattedDate = `${year}${month}${day}`;

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${formattedDate}`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      return "unknown";
    }

    const data = await response.json();
    const events = data.events;

    if (!events) {
      return "unknown";
    }

    for (const event of events) {
      const competitors = event.competitions?.[0]?.competitors;
      if (!competitors || competitors.length < 2) {
        continue;
      }

      const homeTeam = competitors.find((c: any) => c.homeAway === "home");
      const awayTeam = competitors.find((c: any) => c.homeAway === "away");

      if (!homeTeam || !awayTeam) {
        continue;
      }

      if (
        teamsMatch(homeTeam.team.displayName, q.homeTeam) &&
        teamsMatch(awayTeam.team.displayName, q.awayTeam)
      ) {
        const status = event.status.type.name;
        if (
          status === "STATUS_FINAL_AET" ||
          status === "STATUS_FINAL_PEN"
        ) {
          return "beyond_90";
        } else if (status === "STATUS_FULL_TIME" || status === "STATUS_FINAL") {
          return "regulation";
        } else {
          return "unknown";
        }
      }
    }

    return "unknown"; // No matching event found
  } catch (error) {
    console.error("Error fetching regulation outcome:", error);
    return "unknown";
  }
};
