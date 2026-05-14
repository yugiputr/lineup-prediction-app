import type { MatchStatus } from "@/lib/by433";

const labels: Record<MatchStatus, string> = {
  upcoming: "Open",
  live: "Live",
  finished: "Finished",
  unknown: "Unknown",
};

const classes: Record<MatchStatus, string> = {
  upcoming: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  live: "bg-red-100 text-red-700 ring-red-200",
  finished: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  unknown: "bg-amber-100 text-amber-700 ring-amber-200",
};

export function StatusPill({ status }: { status: MatchStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${classes[status]}`}>{labels[status]}</span>;
}
