import type { AppRole } from "./by433";

export type Pick = {
  playerId: number;
  pickedRole: AppRole;
};

export type OfficialPlayer = {
  playerId: number;
  role: AppRole | null;
  isStarter: boolean;
};

export type ScoreBreakdown = Pick & {
  points: number;
  resultStatus: "correct_role" | "correct_starter" | "miss";
  officialRole: AppRole | null;
};

export function scorePrediction(picks: Pick[], officialPlayers: OfficialPlayer[]) {
  const starters = new Map(
    officialPlayers.filter((p) => p.isStarter).map((p) => [p.playerId, p]),
  );

  let totalScore = 0;
  let correctStarters = 0;
  let correctRoles = 0;
  let missedPicks = 0;

  const breakdown: ScoreBreakdown[] = picks.map((pick) => {
    const official = starters.get(pick.playerId);

    if (!official) {
      totalScore -= 1;
      missedPicks += 1;
      return { ...pick, points: -1, resultStatus: "miss", officialRole: null };
    }

    let points = 1;
    correctStarters += 1;

    if (official.role && official.role === pick.pickedRole) {
      points += 1;
      correctRoles += 1;
    }

    totalScore += points;

    return {
      ...pick,
      points,
      resultStatus: points === 2 ? "correct_role" : "correct_starter",
      officialRole: official.role,
    };
  });

  return { totalScore, correctStarters, correctRoles, missedPicks, breakdown };
}
