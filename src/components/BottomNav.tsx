import Link from "next/link";

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 text-center text-xs font-semibold text-zinc-600">
        <Link className="py-3 text-emerald-700" href="/">Matches</Link>
        <span className="py-3">Rooms</span>
        <span className="py-3">Profile</span>
      </div>
    </nav>
  );
}
