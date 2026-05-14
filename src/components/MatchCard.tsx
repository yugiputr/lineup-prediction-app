import Link from "next/link";
import { formatKickoff, getClubLogoUrl, getLockLabel, mapStatus, type By433Match } from "@/lib/by433";
import { ImageWithFallback } from "./ImageWithFallback";
import { StatusPill } from "./StatusPill";

export function MatchCard({ match }: { match: By433Match }) {
  const status = mapStatus(match.eventStatusType);
  const homeLogo = getClubLogoUrl(match.homeLogoId ?? match.homeTeamId);
  const awayLogo = getClubLogoUrl(match.awayLogoId ?? match.awayTeamId);

  return (
    <Link href={`/matches/${match.id}`} className="block rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{match.tournamentStageName ?? "Premier League"} · Round {match.round}</p>
          <p className="mt-1 text-sm font-semibold text-zinc-600">{formatKickoff(match.startDateTimeUtc)}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageWithFallback src={homeLogo} alt={match.homeTeam} fallbackLabel={match.homeTeam} />
            <span className="font-bold text-zinc-900">{match.shortenedHomeTeamName ?? match.homeTeam}</span>
          </div>
          {status === "finished" && <span className="text-xl font-black">{match.scoreHomeTeam}</span>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ImageWithFallback src={awayLogo} alt={match.awayTeam} fallbackLabel={match.awayTeam} />
            <span className="font-bold text-zinc-900">{match.shortenedAwayTeamName ?? match.awayTeam}</span>
          </div>
          {status === "finished" && <span className="text-xl font-black">{match.scoreAwayTeam}</span>}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="text-sm font-semibold text-zinc-500">{status === "upcoming" ? getLockLabel(match.startDateTimeUtc) : match.eventStatus}</span>
        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white">{status === "finished" ? "View" : "Predict"}</span>
      </div>
    </Link>
  );
}
