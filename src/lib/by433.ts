export const BY433_BASE_URL = "https://matchdata.prod.by433.com";
export const BY433_MEDIA_BASE_URL = "https://media.prod.by433.com/media/logos";
export const PREMIER_LEAGUE_STAGE_ID = 900326;

export type MatchStatus = "upcoming" | "live" | "finished" | "unknown";

export type By433Match = {
  id: number;
  tournamentTemplateId?: number;
  tournamentId?: number;
  tournamentStageId?: number;
  tournamentStage?: string;
  tournamentStageName?: string;
  startDateTimeUtc: string;
  localStartDate?: string;
  startDateUtc?: string;
  startTimeUtc?: string;
  eventStatus?: string;
  eventStatusType?: string;
  eventStatusId?: number;
  homeTeamId: number;
  homeTeam: string;
  shortenedHomeTeamName?: string | null;
  awayTeamId: number;
  awayTeam: string;
  shortenedAwayTeamName?: string | null;
  scoreHomeTeam?: number | null;
  scoreAwayTeam?: number | null;
  homeLogoId?: number | null;
  awayLogoId?: number | null;
  homeShirtColor?: string | null;
  awayShirtColor?: string | null;
  roundId?: number;
  round?: string;
};

export type By433Team = {
  id: number;
  eventId: number;
  participantId: number;
  name: string;
  formation?: string;
  homeTeam: boolean;
  shirtColor?: string;
  clubLogo?: number;
  lineUp?: unknown[];
  shortenedName?: string | null;
};

export type By433LineupPlayer = {
  teamName: string;
  teamId: number;
  playerName: string;
  playerFullName?: string;
  playerId: number;
  countryId?: number;
  positionName: string;
  shirtNumber?: number;
  position?: number;
  captain?: boolean;
  yellowCard?: boolean;
  secondYellowCard?: boolean;
  redCard?: boolean;
  rating?: number | null;
  substitutedByPlayerId?: number | null;
  isSubstituted?: boolean;
  playerFirstName?: string;
  playerLastName?: string;
};

export type By433TeamPlayer = {
  id: number;
  name: string;
  countryId?: number;
  countryName?: string;
  role?: string;
  position?: string;
  shirtNumber?: number;
  onLoan?: boolean;
  onLoanTo?: string | null;
};

export type By433TeamDetail = {
  id: number;
  name: string;
  shortenedName?: string | null;
  clubLogo?: number;
  shirtColor?: string;
  countryId?: number;
  countryName?: string;
  isNationalTeam?: boolean;
  players?: By433TeamPlayer[] | null;
};

export type AppPlayer = {
  id: number;
  name: string;
  shirtNumber?: number;
  position?: string;
  role: AppRole | null;
  countryName?: string;
  rawRole?: string;
  onLoan?: boolean;
  onLoanTo?: string | null;
};

export type By433EventDetail = {
  id: number;
  name: string;
  startDateTimeUtc: string;
  startDateUtc?: string;
  startTimeUtc?: string;
  eventStatus?: string;
  eventStatusType?: string;
  eventStatusId?: number;
  live?: boolean;
  lineupConfirmed?: boolean;
  round?: string;
  tournamentStageName?: string;
  tournamentStageId?: number;
  tournamentTemplateId?: number;
  venueName?: string | null;
  leagueName?: string;
  teams: By433Team[];
  lineUps: By433LineupPlayer[];
};

export type AppRole = "GK" | "DEF" | "MID" | "FWD";

const STARTER_POSITION_NAMES = new Set(["Goalkeeper", "Defence", "Midfield", "Forward"]);
const UNAVAILABLE_POSITION_NAMES = new Set(["Injured", "Suspended", "Doubtful", "Lack of fitness"]);

export function mapStatus(statusType?: string): MatchStatus {
  const normalized = statusType?.toLowerCase();
  if (normalized === "finished") return "finished";
  if (["live", "playing", "inprogress", "in_progress"].includes(normalized ?? "")) return "live";
  if (["notstarted", "not_started", "upcoming"].includes(normalized ?? "")) return "upcoming";
  return "unknown";
}

export function map433PositionToRole(positionName?: string): AppRole | null {
  switch (positionName) {
    case "Goalkeeper":
      return "GK";
    case "Defence":
      return "DEF";
    case "Midfield":
      return "MID";
    case "Forward":
      return "FWD";
    default:
      return null;
  }
}

export function mapTeamPositionToRole(position?: string): AppRole | null {
  switch (position) {
    case "keeper":
      return "GK";
    case "defender":
      return "DEF";
    case "midfielder":
      return "MID";
    case "forward":
      return "FWD";
    default:
      return null;
  }
}

export function teamPlayerToAppPlayer(player: By433TeamPlayer): AppPlayer {
  return {
    id: player.id,
    name: player.name,
    shirtNumber: player.shirtNumber,
    position: player.position,
    role: mapTeamPositionToRole(player.position),
    countryName: player.countryName,
    rawRole: player.role,
    onLoan: player.onLoan,
    onLoanTo: player.onLoanTo,
  };
}

export function isAvailableSquadPlayer(player: AppPlayer) {
  return player.rawRole === "athlete" && !player.onLoan && Boolean(player.role);
}

export function sortPlayersByPosition(a: AppPlayer, b: AppPlayer) {
  const order: Record<AppRole, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
  const roleA = a.role ? order[a.role] : 99;
  const roleB = b.role ? order[b.role] : 99;
  if (roleA !== roleB) return roleA - roleB;
  return a.name.localeCompare(b.name);
}

export function isStarterPosition(positionName?: string) {
  return STARTER_POSITION_NAMES.has(positionName ?? "");
}

export function isBenchPosition(positionName?: string) {
  return positionName === "Substitute player";
}

export function isUnavailablePosition(positionName?: string) {
  return UNAVAILABLE_POSITION_NAMES.has(positionName ?? "");
}

export function isCoach(positionName?: string) {
  return positionName === "Coach";
}

export function getClubLogoUrl(id?: number | null) {
  if (!id) return null;
  return `${BY433_MEDIA_BASE_URL}/club/${id}.png`;
}

export function getPlayerImageUrl(playerId?: number | null) {
  if (!playerId) return null;
  return `${BY433_MEDIA_BASE_URL}/player/${playerId}.png`;
}

export async function getPremierLeagueMatches() {
  const url = `${BY433_BASE_URL}/events/bytournamenttemplateround?tournamentStageId=${PREMIER_LEAGUE_STAGE_ID}`;
  const res = await fetch(url, { next: { revalidate: 60 * 15 } });

  if (!res.ok) {
    throw new Error(`Failed to fetch matches: ${res.status}`);
  }

  return (await res.json()) as By433Match[];
}

export async function getEventDetail(eventId: string | number) {
  const url = `${BY433_BASE_URL}/event/${eventId}?details=True`;
  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(`Failed to fetch event detail: ${res.status}`);
  }

  return (await res.json()) as By433EventDetail;
}

export async function getTeamDetail(teamId: string | number) {
  const url = `${BY433_BASE_URL}/team/${teamId}?details=True`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 } });

  if (!res.ok) {
    throw new Error(`Failed to fetch team detail: ${res.status}`);
  }

  return (await res.json()) as By433TeamDetail;
}

export function formatKickoff(value: string) {
  const date = new Date(`${value.endsWith("Z") ? value : `${value}Z`}`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export function getLockAt(value: string) {
  const date = new Date(`${value.endsWith("Z") ? value : `${value}Z`}`);
  return new Date(date.getTime() - 65 * 60 * 1000);
}

export function getLockLabel(value: string) {
  const lockAt = getLockAt(value);
  const diff = lockAt.getTime() - Date.now();
  if (diff <= 0) return "Locked";
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `Locks in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Locks in ${hours}h ${rest}m`;
}
