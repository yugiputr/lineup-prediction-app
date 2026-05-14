import { BottomNav } from "@/components/BottomNav";
import { MatchCard } from "@/components/MatchCard";
import { getPremierLeagueMatches, mapStatus } from "@/lib/by433";

export default async function Home() {
  const matches = await getPremierLeagueMatches();
  const sorted = [...matches].sort((a, b) => new Date(a.startDateTimeUtc + "Z").getTime() - new Date(b.startDateTimeUtc + "Z").getTime());
  const upcoming = sorted.filter((match) => mapStatus(match.eventStatusType) === "upcoming");
  const finished = sorted.filter((match) => mapStatus(match.eventStatusType) === "finished").slice(-6).reverse();
  const featured = upcoming[0] ?? sorted[0];

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-24 pt-5 md:max-w-5xl md:pb-10">
      <header className="mb-5 rounded-[2rem] bg-zinc-950 p-5 text-white shadow-xl shadow-emerald-950/10 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-300">XI Genius</p>
            <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">Tebak starting XI sebelum kickoff.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 md:text-base">Fantasy football terlalu lama. Ini cuma pre-match battle: pick 11 pemain, cocokkan dengan official lineup, adu akurat sama teman.</p>
          </div>
          <div className="hidden rounded-2xl bg-white/10 px-4 py-3 text-center md:block">
            <p className="text-3xl font-black">+2</p>
            <p className="text-xs text-zinc-300">starter + role</p>
          </div>
        </div>
      </header>

      {featured && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Featured Match</h2>
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-400">Premier League</span>
          </div>
          <MatchCard match={featured} />
        </section>
      )}

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black">Upcoming Matches</h2>
          <p className="text-sm font-semibold text-zinc-500">{upcoming.length} open</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(upcoming.length ? upcoming : sorted.slice(0, 8)).slice(0, 8).map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-black">Recent Results</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {finished.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
