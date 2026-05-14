import Link from "next/link";
import { LineupPicker } from "./LineupPicker";
import { getClubLogoUrl, getEventDetail, getTeamDetail, isAvailableSquadPlayer, sortPlayersByPosition, teamPlayerToAppPlayer } from "@/lib/by433";

export default async function PickPage({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ teamId?: string }> }) {
  const { eventId } = await params;
  const { teamId } = await searchParams;
  const event = await getEventDetail(eventId);
  const selectedTeam = event.teams.find((team) => String(team.id) === teamId) ?? event.teams[0];
  const teamDetail = await getTeamDetail(selectedTeam.id);
  const players = (teamDetail.players ?? [])
    .map(teamPlayerToAppPlayer)
    .filter(isAvailableSquadPlayer)
    .sort(sortPlayersByPosition);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-5 md:max-w-5xl">
      <Link href={`/matches/${event.id}`} className="mb-4 inline-flex text-sm font-bold text-zinc-500 hover:text-zinc-950">← Match detail</Link>
      <header className="mb-5 rounded-[2rem] bg-zinc-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Pick lineup</p>
        <h1 className="mt-2 text-3xl font-black">{selectedTeam.name} XI</h1>
        <p className="mt-2 text-sm font-semibold text-zinc-300">MVP prototype: pilih 11 pemain + broad role GK/DEF/MID/FWD.</p>
      </header>
      <LineupPicker
        players={players}
        teamName={selectedTeam.name}
        teamLogoUrl={getClubLogoUrl(selectedTeam.clubLogo ?? selectedTeam.id)}
        shirtColor={selectedTeam.shirtColor}
        initialFormation={selectedTeam.formation || "4-4-2"}
      />
    </main>
  );
}
