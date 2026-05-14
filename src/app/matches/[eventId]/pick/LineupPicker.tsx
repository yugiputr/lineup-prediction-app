"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { getPlayerImageUrl, type AppPlayer, type AppRole } from "@/lib/by433";

type Pick = {
  slotId: string;
  playerId: number;
  role: AppRole;
};

type PitchSlot = {
  id: string;
  role: AppRole;
  label: string;
  x: number;
  y: number;
};

type SlotOverride = { x: number; y: number; label: string; role: AppRole };
type SlotOverrides = Record<string, SlotOverride>;

const FORMATIONS = ["4-3-3", "4-3-2-1", "4-2-3-1", "4-4-2", "3-5-2", "3-4-3", "5-3-2", "5-4-1"];

// ─── Football zone definitions ────────────────────────────────────────────────
// Y% from top: 0% = attacking end (FWD), 100% = defending end (GK)
type FootballZone = "GK" | "DEF" | "DM" | "MID" | "AM" | "FWD";

const ZONE_THRESHOLDS: { zone: FootballZone; minY: number; maxY: number }[] = [
  { zone: "FWD", minY: 8,  maxY: 28 },
  { zone: "AM",  minY: 28, maxY: 42 },
  { zone: "MID", minY: 42, maxY: 56 },
  { zone: "DM",  minY: 56, maxY: 68 },
  { zone: "DEF", minY: 68, maxY: 84 },
  { zone: "GK",  minY: 84, maxY: 100 },
];

function getZone(y: number): FootballZone {
  for (const { zone, minY, maxY } of ZONE_THRESHOLDS) {
    if (y >= minY && y < maxY) return zone;
  }
  return y < 8 ? "FWD" : "GK";
}

function zoneToAppRole(zone: FootballZone): AppRole {
  if (zone === "GK") return "GK";
  if (zone === "DEF") return "DEF";
  if (zone === "FWD") return "FWD";
  return "MID";
}

// ─── Label derivation per row ─────────────────────────────────────────────────
function deriveLabelsForRow(
  zone: FootballZone,
  slotsInRow: { id: string; x: number }[],
): Record<string, string> {
  const sorted = [...slotsInRow].sort((a, b) => a.x - b.x);
  const count = sorted.length;
  const result: Record<string, string> = {};

  if (zone === "GK") {
    sorted.forEach((s) => { result[s.id] = "GK"; });
    return result;
  }

  if (zone === "DEF") {
    if (count === 1) { result[sorted[0].id] = "CB"; }
    else if (count === 2) { result[sorted[0].id] = "LCB"; result[sorted[1].id] = "RCB"; }
    else if (count === 3) { result[sorted[0].id] = "LCB"; result[sorted[1].id] = "CB"; result[sorted[2].id] = "RCB"; }
    else if (count === 4) { result[sorted[0].id] = "LB"; result[sorted[1].id] = "LCB"; result[sorted[2].id] = "RCB"; result[sorted[3].id] = "RB"; }
    else if (count === 5) { result[sorted[0].id] = "LWB"; result[sorted[1].id] = "LCB"; result[sorted[2].id] = "CB"; result[sorted[3].id] = "RCB"; result[sorted[4].id] = "RWB"; }
    else { sorted.forEach((s, i) => { result[s.id] = i === 0 ? "LB" : i === count - 1 ? "RB" : "CB"; }); }
    return result;
  }

  if (zone === "DM") {
    if (count === 1) { result[sorted[0].id] = "DM"; }
    else if (count === 2) { result[sorted[0].id] = "LDM"; result[sorted[1].id] = "RDM"; }
    else { sorted.forEach((s, i) => { result[s.id] = i === 0 ? "LDM" : i === count - 1 ? "RDM" : "DM"; }); }
    return result;
  }

  if (zone === "MID") {
    if (count === 1) { result[sorted[0].id] = "CM"; }
    else if (count === 2) { result[sorted[0].id] = "LCM"; result[sorted[1].id] = "RCM"; }
    else if (count === 3) { result[sorted[0].id] = "LM"; result[sorted[1].id] = "CM"; result[sorted[2].id] = "RM"; }
    else if (count === 4) { result[sorted[0].id] = "LM"; result[sorted[1].id] = "LCM"; result[sorted[2].id] = "RCM"; result[sorted[3].id] = "RM"; }
    else { sorted.forEach((s, i) => { result[s.id] = i === 0 ? "LM" : i === count - 1 ? "RM" : "CM"; }); }
    return result;
  }

  if (zone === "AM") {
    if (count === 1) { result[sorted[0].id] = "CAM"; }
    else if (count === 2) { result[sorted[0].id] = "LAM"; result[sorted[1].id] = "RAM"; }
    else if (count === 3) { result[sorted[0].id] = "LW"; result[sorted[1].id] = "CAM"; result[sorted[2].id] = "RW"; }
    else { sorted.forEach((s, i) => { result[s.id] = i === 0 ? "LW" : i === count - 1 ? "RW" : "CAM"; }); }
    return result;
  }

  if (zone === "FWD") {
    if (count === 1) { result[sorted[0].id] = "ST"; }
    else if (count === 2) { result[sorted[0].id] = "LST"; result[sorted[1].id] = "RST"; }
    else if (count === 3) { result[sorted[0].id] = "LW"; result[sorted[1].id] = "ST"; result[sorted[2].id] = "RW"; }
    else { sorted.forEach((s, i) => { result[s.id] = i === 0 ? "LW" : i === count - 1 ? "RW" : "ST"; }); }
    return result;
  }

  sorted.forEach((s) => { result[s.id] = zone; });
  return result;
}

// ─── Formation string derivation ─────────────────────────────────────────────
// Cluster non-GK slots by Y proximity (gap > 8% = new row), count per row.
function deriveFormationString(slots: { id: string; y: number }[]): string {
  const nonGk = slots
    .filter((s) => getZone(s.y) !== "GK")
    .sort((a, b) => b.y - a.y); // bottom → top (DEF first)

  if (nonGk.length === 0) return "";

  const rows: number[][] = [];
  let currentRow: number[] = [nonGk[0].y];

  for (let i = 1; i < nonGk.length; i++) {
    const gap = currentRow[currentRow.length - 1] - nonGk[i].y;
    if (gap > 8) {
      rows.push(currentRow);
      currentRow = [nonGk[i].y];
    } else {
      currentRow.push(nonGk[i].y);
    }
  }
  rows.push(currentRow);

  return rows.map((r) => r.length).join("-");
}

// ─── Re-derive labels + formation after drop ──────────────────────────────────
function rederiveSlots(
  slots: PitchSlot[],
  overrides: SlotOverrides,
): { newOverrides: SlotOverrides; derivedFormation: string } {
  const resolved = slots.map((s) => ({
    id: s.id,
    x: overrides[s.id]?.x ?? s.x,
    y: overrides[s.id]?.y ?? s.y,
  }));

  // Group by zone
  const byZone = new Map<FootballZone, typeof resolved>();
  for (const s of resolved) {
    const zone = getZone(s.y);
    if (!byZone.has(zone)) byZone.set(zone, []);
    byZone.get(zone)!.push(s);
  }

  const newOverrides: SlotOverrides = { ...overrides };
  for (const [zone, slotsInZone] of byZone) {
    const labels = deriveLabelsForRow(zone, slotsInZone);
    const role = zoneToAppRole(zone);
    for (const s of slotsInZone) {
      const base = slots.find((sl) => sl.id === s.id)!;
      newOverrides[s.id] = {
        x: overrides[s.id]?.x ?? base.x,
        y: overrides[s.id]?.y ?? base.y,
        label: labels[s.id] ?? zone,
        role,
      };
    }
  }

  const derivedFormation = deriveFormationString(resolved);
  return { newOverrides, derivedFormation };
}

type LineupPickerProps = {
  players: AppPlayer[];
  teamName: string;
  teamLogoUrl?: string | null;
  shirtColor?: string | null;
  initialFormation?: string;
};

export function LineupPicker({ players, teamName, teamLogoUrl, shirtColor, initialFormation = "4-3-3" }: LineupPickerProps) {
  const defaultFormation = FORMATIONS.includes(initialFormation) ? initialFormation : "4-3-3";
  const [formation, setFormation] = useState<string | null>(null);
  const pitchSlots = useMemo(() => buildPitchSlots(formation ?? defaultFormation), [formation, defaultFormation]);
  const availablePlayers = useMemo(() => players, [players]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [slotOverrides, setSlotOverrides] = useState<SlotOverrides>({});
  const [derivedFormation, setDerivedFormation] = useState<string | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

  const selectedPlayerIds = new Set(picks.map((pick) => pick.playerId));
  const picksBySlot = new Map(picks.map((pick) => [pick.slotId, pick]));

  // Resolve final slot position + label
  const resolvedSlots = useMemo(
    () =>
      pitchSlots.map((slot) => {
        const ov = slotOverrides[slot.id];
        return {
          ...slot,
          x: ov?.x ?? slot.x,
          y: ov?.y ?? slot.y,
          label: ov?.label ?? slot.label,
          role: ov?.role ?? slot.role,
        };
      }),
    [pitchSlots, slotOverrides],
  );

  const displayFormation = derivedFormation ?? formation ?? defaultFormation;

  const activeSlot = resolvedSlots.find((slot) => slot.id === activeSlotId) ?? null;
  const activePick = activeSlotId ? picksBySlot.get(activeSlotId) : null;
  const activePlayer = activePick ? availablePlayers.find((player) => player.id === activePick.playerId) : null;

  const pickerPlayers = availablePlayers.filter((player) => {
    const q = query.trim().toLowerCase();
    const isCurrentSlotPlayer = activePick?.playerId === player.id;
    const isAlreadySelectedElsewhere = selectedPlayerIds.has(player.id) && !isCurrentSlotPlayer;
    if (isAlreadySelectedElsewhere) return false;
    if (!q) return true;
    return player.name.toLowerCase().includes(q);
  });

  function getPlayer(playerId: number) {
    return availablePlayers.find((player) => player.id === playerId);
  }

  function assignPlayerToSlot(playerId: number, slot: PitchSlot) {
    setPicks((current) => {
      const withoutPlayerOrSlot = current.filter((pick) => pick.playerId !== playerId && pick.slotId !== slot.id);
      return [...withoutPlayerOrSlot, { slotId: slot.id, playerId, role: slot.role }];
    });
    closeBottomSheet();
  }

  function removeSlot(slotId: string) {
    setPicks((current) => current.filter((pick) => pick.slotId !== slotId));
    closeBottomSheet();
  }

  function openSlot(slot: PitchSlot) {
    setQuery("");
    setActiveSlotId(slot.id);
  }

  function closeBottomSheet() {
    setActiveSlotId(null);
    setQuery("");
  }

  // Drag handler — tap vs drag distinguished by movement threshold
  const makeDragHandlers = useCallback(
    (slot: PitchSlot & { x: number; y: number }) => ({
      onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        e.currentTarget.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        let dragging = false;
        let latestX = slot.x;
        let latestY = slot.y;

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          if (!dragging && Math.hypot(dx, dy) < 6) return;
          dragging = true;

          const pitch = pitchRef.current;
          if (!pitch) return;
          const rect = pitch.getBoundingClientRect();
          latestX = clamp(((ev.clientX - rect.left) / rect.width) * 100, 5, 95);
          latestY = clamp(((ev.clientY - rect.top) / rect.height) * 100, 5, 95);

          // Live position update — label stays until drop
          setSlotOverrides((prev) => ({
            ...prev,
            [slot.id]: {
              x: latestX,
              y: latestY,
              label: prev[slot.id]?.label ?? slot.label,
              role: prev[slot.id]?.role ?? slot.role,
            },
          }));
        };

        const onUp = (ev: PointerEvent) => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);

          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          if (Math.hypot(dx, dy) < 6) {
            openSlot(slot);
          } else {
            // On drop: re-derive labels + formation string
            setSlotOverrides((prev) => {
              const withDrop: SlotOverrides = {
                ...prev,
                [slot.id]: {
                  x: latestX,
                  y: latestY,
                  label: prev[slot.id]?.label ?? slot.label,
                  role: prev[slot.id]?.role ?? slot.role,
                },
              };
              const { newOverrides, derivedFormation: df } = rederiveSlots(pitchSlots, withDrop);
              setDerivedFormation(df || null);
              return newOverrides;
            });
          }
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      },
    }),
    [pitchRef, pitchSlots],
  );

  if (!formation) {
    return (
      <section className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-zinc-200 md:p-6">
        <TeamHeader teamName={teamName} teamLogoUrl={teamLogoUrl} shirtColor={shirtColor} formation={defaultFormation} />
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-600">Step 1</p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">Pilih formasi dulu</h2>
          <p className="mt-2 text-sm font-semibold text-zinc-500">Setelah formasi dipilih, tap posisi di pitch untuk memilih pemain.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {FORMATIONS.map((item) => (
            <button
              key={item}
              onClick={() => { setFormation(item); setSlotOverrides({}); setDerivedFormation(null); }}
              className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md md:p-5 ${item === defaultFormation ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-zinc-50"}`}
            >
              <p className="text-2xl font-black text-zinc-950">{item}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-zinc-500">{describeFormation(item)}</p>
              {item === defaultFormation && <p className="mt-3 inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">Suggested</p>}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="relative">
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <section className="-mx-4 min-h-[calc(100dvh-88px)] bg-white px-3 pb-4 pt-3 md:mx-0 md:min-h-0 md:rounded-[2rem] md:p-5 md:shadow-sm md:ring-1 md:ring-zinc-200">
          <div className="mb-3 space-y-3">
            <TeamHeader teamName={teamName} teamLogoUrl={teamLogoUrl} shirtColor={shirtColor} formation={displayFormation} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Step 2</p>
                <h2 className="text-lg font-black md:text-2xl">Tap atau geser posisi</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFormation(null); setPicks([]); setSlotOverrides({}); setDerivedFormation(null); }}
                  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700"
                >
                  Ganti
                </button>
                <div className="rounded-2xl bg-zinc-950 px-3 py-2 text-right text-white">
                  <p className="text-[10px] font-bold text-zinc-300">Selected</p>
                  <p className="text-lg font-black">{picks.length}/11</p>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={pitchRef}
            className="relative h-[calc(100dvh-245px)] min-h-[500px] overflow-hidden rounded-[1.5rem] border border-white/20 bg-[#064c09] shadow-inner sm:h-[620px] md:h-[760px]"
          >
            <PitchLines />

            {resolvedSlots.map((slot) => {
              const pick = picksBySlot.get(slot.id);
              const player = pick ? getPlayer(pick.playerId) : null;
              const dragHandlers = makeDragHandlers(slot);

              return (
                <div
                  key={slot.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none active:cursor-grabbing"
                  style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                  {...dragHandlers}
                >
                  <div className="pointer-events-none flex w-16 flex-col items-center text-center md:w-24">
                    {player ? (
                      <>
                        <div className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-lg ring-2 ring-emerald-300 md:h-14 md:w-14">
                          <ImageWithFallback src={getPlayerImageUrl(player.id)} alt={player.name} size={38} fallbackLabel={player.name} />
                          <span className="absolute -right-1 -top-1 rounded-full bg-zinc-950 px-1.5 py-0.5 text-[9px] font-black text-white md:text-[10px]">{slot.label}</span>
                        </div>
                        <span className="mt-1 line-clamp-2 max-w-16 rounded-lg bg-black/45 px-1 py-0.5 text-[9px] font-black leading-tight text-white backdrop-blur md:max-w-24 md:px-1.5 md:py-1 md:text-xs">
                          {player.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="grid h-12 w-12 place-items-center rounded-full border-2 border-dashed border-white/45 bg-white/10 text-[10px] font-black text-white md:h-20 md:w-20 md:text-xs">
                          {slot.label}
                        </div>
                        <span className="mt-1 rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-bold text-white">Tap</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-zinc-500 md:text-sm">Tap untuk pilih pemain · Geser untuk reposisi slot.</p>
            <button disabled={picks.length !== 11} className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:bg-zinc-300">Submit</button>
          </div>
        </section>

        <section className="hidden rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-zinc-200 lg:block">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Squad</p>
            <h2 className="text-2xl font-black">Players</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-500">Sorted by position. Click a pitch slot to assign.</p>
          </div>
          <DesktopPlayerList players={availablePlayers} />
        </section>
      </div>

      {activeSlot && (
        <PlayerBottomSheet
          slot={activeSlot}
          currentPlayer={activePlayer ?? null}
          players={pickerPlayers}
          query={query}
          onQueryChange={setQuery}
          onClose={closeBottomSheet}
          onRemove={() => removeSlot(activeSlot.id)}
          onPick={(playerId) => assignPlayerToSlot(playerId, activeSlot)}
        />
      )}
    </div>
  );
}

function DesktopPlayerList({ players }: { players: AppPlayer[] }) {
  return (
    <div className="max-h-[760px] space-y-2 overflow-auto pr-1">
      {players.map((player) => (
        <div key={player.id} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-2">
          <ImageWithFallback src={getPlayerImageUrl(player.id)} alt={player.name} size={42} fallbackLabel={player.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{player.name}</p>
            <p className="text-xs font-semibold text-zinc-500">#{player.shirtNumber ?? "-"} · {player.role ?? player.position ?? "-"}</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-600">{player.role ?? "-"}</span>
        </div>
      ))}
    </div>
  );
}

function PlayerBottomSheet({
  slot,
  currentPlayer,
  players,
  query,
  onQueryChange,
  onClose,
  onRemove,
  onPick,
}: {
  slot: PitchSlot;
  currentPlayer: AppPlayer | null;
  players: AppPlayer[];
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onRemove: () => void;
  onPick: (playerId: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div className="max-h-[78dvh] w-full rounded-t-[2rem] bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-300" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Choose player</p>
            <h3 className="mt-1 text-2xl font-black">{slot.label}</h3>
            <p className="text-sm font-semibold text-zinc-500">Recommended role: {slot.role}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-black text-zinc-700">Close</button>
        </div>

        {currentPlayer && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <ImageWithFallback src={getPlayerImageUrl(currentPlayer.id)} alt={currentPlayer.name} size={44} fallbackLabel={currentPlayer.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">Current: {currentPlayer.name}</p>
              <p className="text-xs font-semibold text-zinc-500">#{currentPlayer.shirtNumber ?? "-"} · {currentPlayer.role ?? currentPlayer.position ?? "-"}</p>
            </div>
            <button onClick={onRemove} className="rounded-full bg-red-500 px-3 py-2 text-xs font-black text-white">Remove</button>
          </div>
        )}

        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search player"
          className="mb-3 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
          autoFocus
        />

        <div className="max-h-[48dvh] space-y-2 overflow-auto pr-1">
          {players.map((player) => {
            const roleMatches = player.role === slot.role;
            return (
              <button key={player.id} onClick={() => onPick(player.id)} className="flex w-full items-center gap-3 rounded-2xl bg-zinc-50 p-2 text-left ring-1 ring-transparent transition hover:ring-emerald-200">
                <ImageWithFallback src={getPlayerImageUrl(player.id)} alt={player.name} size={42} fallbackLabel={player.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{player.name}</p>
                  <p className="text-xs font-semibold text-zinc-500">#{player.shirtNumber ?? "-"} · {player.role ?? player.position ?? "-"}</p>
                </div>
                {roleMatches && <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-black text-white">Fit</span>}
              </button>
            );
          })}
          {players.length === 0 && <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">Pemain tidak ditemukan.</p>}
        </div>
      </div>
    </div>
  );
}

function TeamHeader({ teamName, teamLogoUrl, shirtColor, formation }: { teamName: string; teamLogoUrl?: string | null; shirtColor?: string | null; formation: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl md:h-12 md:w-12" style={{ backgroundColor: shirtColor ?? "transparent" }}>
        <ImageWithFallback src={teamLogoUrl ?? null} alt={teamName} size={38} fallbackLabel={teamName} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black md:text-lg">{teamName}</p>
        <p className="text-xs font-semibold text-zinc-500">Build your predicted XI</p>
      </div>
      <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-zinc-200">
        <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Formation</p>
        <p className="text-sm font-black">{formation}</p>
      </div>
    </div>
  );
}

function describeFormation(formation: string) {
  const rows = parseFormation(formation);
  if (rows.length === 3) return "balanced";
  if (rows.length === 4) return "with AM/DM line";
  if (rows[0] === 3) return "back three";
  if (rows[0] === 5) return "defensive";
  return "classic";
}

function buildPitchSlots(formation: string): PitchSlot[] {
  const lines = parseFormation(formation);
  const slots: PitchSlot[] = [{ id: "gk", role: "GK", label: "GK", x: 50, y: 87 }];
  const rowYs = getRowYs(lines.length);

  lines.forEach((count, rowIndex) => {
    const role = getRoleForRow(rowIndex, lines.length);
    const labels = getLabelsForRow(role, count);
    const maxSpread = count > 1 ? clamp(76 / (count - 1), 0, 26) : 0;

    for (let index = 0; index < count; index += 1) {
      const x = 50 + (index - (count - 1) / 2) * maxSpread;
      slots.push({
        id: `${role.toLowerCase()}-${rowIndex}-${index}`,
        role,
        label: labels[index] ?? role,
        x,
        y: rowYs[rowIndex],
      });
    }
  });

  return slots;
}

function parseFormation(formation: string) {
  const parsed = formation.split("-").map((value) => Number.parseInt(value, 10));
  if (parsed.length === 0 || parsed.some((value) => Number.isNaN(value)) || parsed.reduce((sum, value) => sum + value, 0) !== 10) {
    return [4, 3, 3];
  }
  return parsed;
}

function getRowYs(rowCount: number) {
  if (rowCount === 2) return [65, 30];
  if (rowCount === 3) return [68, 48, 26];
  if (rowCount === 4) return [70, 56, 42, 24];
  return Array.from({ length: rowCount }, (_, index) => 70 - index * (46 / Math.max(1, rowCount - 1)));
}

function getRoleForRow(rowIndex: number, rowCount: number): AppRole {
  if (rowIndex === 0) return "DEF";
  if (rowIndex === rowCount - 1) return "FWD";
  return "MID";
}

function getLabelsForRow(role: AppRole, count: number) {
  if (role === "DEF") {
    if (count === 3) return ["LCB", "CB", "RCB"];
    if (count === 4) return ["LB", "LCB", "RCB", "RB"];
    if (count === 5) return ["LWB", "LCB", "CB", "RCB", "RWB"];
  }
  if (role === "MID") {
    if (count === 1) return ["CM"];
    if (count === 2) return ["LCM", "RCM"];
    if (count === 3) return ["LM", "CM", "RM"];
    if (count === 4) return ["LM", "LCM", "RCM", "RM"];
    if (count === 5) return ["LM", "LCM", "CM", "RCM", "RM"];
  }
  if (role === "FWD") {
    if (count === 1) return ["ST"];
    if (count === 2) return ["LST", "RST"];
    if (count === 3) return ["LW", "ST", "RW"];
  }
  return Array.from({ length: count }, () => role);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function PitchLines() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="0" y="0" width="100" height="160" fill="#064c09" />
      {Array.from({ length: 9 }).map((_, index) => (
        <rect key={index} x={4 + index * 10.2} y="5" width="10.2" height="150" fill={index % 2 === 0 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.035)"} />
      ))}
      <rect x="4" y="5" width="92" height="150" rx="2" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="0.7" />
      <line x1="4" y1="80" x2="96" y2="80" stroke="rgba(255,255,255,.25)" strokeWidth="0.55" />
      <circle cx="50" cy="80" r="12" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="0.55" />
      <circle cx="50" cy="80" r="1.2" fill="rgba(255,255,255,.35)" />
      <rect x="22" y="5" width="56" height="26" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.5" />
      <rect x="36" y="5" width="28" height="10" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.5" />
      <circle cx="50" cy="38" r="1" fill="rgba(255,255,255,.3)" />
      <path d="M38 31 Q50 40 62 31" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="0.5" />
      <rect x="22" y="129" width="56" height="26" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.5" />
      <rect x="36" y="145" width="28" height="10" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.5" />
      <circle cx="50" cy="122" r="1" fill="rgba(255,255,255,.3)" />
      <path d="M38 129 Q50 120 62 129" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="0.5" />
    </svg>
  );
}
