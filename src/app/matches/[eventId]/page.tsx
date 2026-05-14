import Link from "next/link";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { StatusPill } from "@/components/StatusPill";
import {
  formatKickoff,
  getClubLogoUrl,
  getEventDetail,
  getLockLabel,
  getPlayerImageUrl,
  getTeamDetail,
  isAvailableSquadPlayer,
  mapStatus,
  sortPlayersByPosition,
  teamPlayerToAppPlayer,
  type AppPlayer,
} from "@/lib/by433";

export default async function MatchDetail({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEventDetail(eventId);
  const status = mapStatus(event.eventStatusType);
  const [home, away] = event.teams;
  const teamDetails = await Promise.all(event.teams.map((team) => getTeamDetail(team.id)));
  const playersByTeam = event.teams.map((team) => {
    const detail = teamDetails.find((item) => item.id === team.id);
    return {
      team,
      players: (detail?.players ?? [])
        .map(teamPlayerToAppPlayer)
        .filter(isAvailableSquadPlayer)
        .sort(sortPlayersByPosition),
    };
  });

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-5 md:max-w-5xl">
      <Link href="/" className="mb-4 inline-flex text-sm font-bold text-zinc-500 hover:text-zinc-950">← Matches</Link>

      <section className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-zinc-200 md:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">{event.leagueName ?? event.tournamentStageName}</p>
            <h1 className="mt-2 text-2xl font-black md:text-4xl">{event.name.replace("-", " vs ")}</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-500">{formatKickoff(event.startDateTimeUtc)} · {event.venueName ?? "Venue TBA"}</p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl bg-zinc-50 p-4">
          {[home, away].map((team, index) => (
            <div key={team?.id ?? index} className="flex flex-col items-center text-center">
              <ImageWithFallback src={getClubLogoUrl(team?.clubLogo ?? team?.id)} alt={team?.name ?? "Team"} size={64} fallbackLabel={team?.name} />
              <p className="mt-2 text-sm font-black md:text-base">{team?.shortenedName ?? team?.name}</p>
              {team?.formation && <p className="text-xs font-semibold text-zinc-500">{team.formation}</p>}
            </div>
          ))}
          <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-zinc-200">
            <p className="text-xs font-bold text-zinc-400">ROUND</p>
            <p className="text-lg font-black">{event.round}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <p className="text-xs font-bold uppercase text-emerald-700">Lineup status</p>
            <p className="mt-1 text-xl font-black">{event.lineupConfirmed ? "Confirmed" : "Not confirmed"}</p>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <p className="text-xs font-bold uppercase text-zinc-500">Prediction lock</p>
            <p className="mt-1 text-xl font-black">{getLockLabel(event.startDateTimeUtc)}</p>
          </div>
          <div className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <p className="text-xs font-bold uppercase text-zinc-500">Scoring</p>
            <p className="mt-1 text-xl font-black">+2 / +1 / -1</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {event.teams.map((team) => (
            <Link key={team.id} href={`/matches/${event.id}/pick?teamId=${team.id}`} className="rounded-2xl bg-zinc-950 px-5 py-4 text-center font-black text-white transition hover:bg-emerald-700">
              Predict {team.shortenedName ?? team.name} XI
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {playersByTeam.map(({ team, players }) => (
          <div key={team.id} className="rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="mb-4 flex items-center gap-3">
              <ImageWithFallback src={getClubLogoUrl(team.clubLogo ?? team.id)} alt={team.name} fallbackLabel={team.name} />
              <div>
                <h2 className="font-black">{team.name}</h2>
                <p className="text-sm font-semibold text-zinc-500">{players.length} players available</p>
              </div>
            </div>

            <PlayerList players={players} empty="Player list belum tersedia" />
          </div>
        ))}
      </section>
    </main>
  );
}

function PlayerList({ players, empty }: { players: AppPlayer[]; empty: string }) {
  if (players.length === 0) {
    return <p className="rounded-2xl bg-zinc-50 p-3 text-sm font-semibold text-zinc-500">{empty}</p>;
  }

  return (
    <div className="grid gap-2">
      {players.map((player) => (
        <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-2">
          <ImageWithFallback src={getPlayerImageUrl(player.id)} alt={player.name} size={40} fallbackLabel={player.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{player.name}</p>
            <p className="text-xs font-semibold text-zinc-500">#{player.shirtNumber ?? "-"} {player.role ? `· ${player.role}` : ""}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
