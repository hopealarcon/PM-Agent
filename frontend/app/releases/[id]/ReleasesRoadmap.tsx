"use client";

import { useState } from "react";

interface Entry {
  release: string;
  task: string;
  assigned_to: string;
  role: string;
  start_date: string;
  end_date: string;
  duration_days: number;
}

interface Props {
  entries: Entry[];
  go_live_dates: Record<string, string>;
  resources: { name: string; role: string }[];
}

const COLOR_PALETTE = [
  { bg: "bg-indigo-400", hex: "#818cf8" },
  { bg: "bg-emerald-400", hex: "#34d399" },
  { bg: "bg-amber-400", hex: "#fbbf24" },
  { bg: "bg-rose-400", hex: "#fb7185" },
  { bg: "bg-violet-400", hex: "#a78bfa" },
  { bg: "bg-cyan-400", hex: "#22d3ee" },
  { bg: "bg-orange-400", hex: "#fb923c" },
  { bg: "bg-pink-400", hex: "#f472b6" },
];

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function getWeekMarkers(start: Date, end: Date): { date: Date; label: string }[] {
  const markers: { date: Date; label: string }[] = [];
  const cur = new Date(start);
  // Advance to next Monday
  while (cur.getDay() !== 1) cur.setDate(cur.getDate() + 1);
  while (cur <= end) {
    markers.push({
      date: new Date(cur),
      label: cur.toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    });
    cur.setDate(cur.getDate() + 7);
  }
  return markers;
}

export default function ReleasesRoadmap({ entries, go_live_dates, resources }: Props) {
  const [tooltip, setTooltip] = useState<{
    entry: Entry;
    x: number;
    y: number;
  } | null>(null);

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">No hay entradas en el schedule.</div>
    );
  }

  // Build person → color map
  const personOrder: string[] = [];
  for (const e of entries) {
    if (!personOrder.includes(e.assigned_to)) personOrder.push(e.assigned_to);
  }
  const personColor: Record<string, (typeof COLOR_PALETTE)[0]> = {};
  personOrder.forEach((p, i) => {
    personColor[p] = COLOR_PALETTE[i % COLOR_PALETTE.length];
  });

  // Timeline bounds
  const allDates = entries.flatMap(e => [parseDate(e.start_date), parseDate(e.end_date)]);
  const timelineStart = new Date(Math.min(...allDates.map(d => d.getTime())));
  const timelineEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = daysBetween(timelineStart, timelineEnd) || 1;

  function pct(date: Date): number {
    return (daysBetween(timelineStart, date) / totalDays) * 100;
  }

  // Group entries by release
  const releaseNames = Array.from(new Set(entries.map(e => e.release)));

  // Sort releases by go-live date
  releaseNames.sort((a, b) => {
    const da = go_live_dates[a] ? parseDate(go_live_dates[a]) : new Date(8640000000000000);
    const db = go_live_dates[b] ? parseDate(go_live_dates[b]) : new Date(8640000000000000);
    return da.getTime() - db.getTime();
  });

  // For each release, stack tasks into rows (avoid overlapping)
  function buildRows(releaseEntries: Entry[]): Entry[][] {
    const rows: Entry[][] = [];
    for (const entry of releaseEntries) {
      const entryStart = parseDate(entry.start_date);
      const entryEnd = parseDate(entry.end_date);
      let placed = false;
      for (const row of rows) {
        const last = row[row.length - 1];
        if (parseDate(last.end_date) < entryStart) {
          row.push(entry);
          placed = true;
          break;
        }
      }
      if (!placed) rows.push([entry]);
    }
    return rows;
  }

  const releaseRows: Record<string, Entry[][]> = {};
  for (const rel of releaseNames) {
    const relEntries = entries.filter(e => e.release === rel);
    releaseRows[rel] = buildRows(relEntries);
  }

  const ROW_HEIGHT = 32;
  const SWIMLANE_PADDING = 16;
  const HEADER_HEIGHT = 32;

  // Compute swimlane heights
  const swimlaneHeights: Record<string, number> = {};
  for (const rel of releaseNames) {
    swimlaneHeights[rel] =
      releaseRows[rel].length * ROW_HEIGHT + SWIMLANE_PADDING * 2 + HEADER_HEIGHT;
  }
  const totalGanttHeight = releaseNames.reduce((sum, r) => sum + swimlaneHeights[r], 0);

  const weekMarkers = getWeekMarkers(timelineStart, timelineEnd);

  return (
    <div className="space-y-8">
      {/* Part 1: Go-live cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Go-live por release</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releaseNames.map(rel => {
            const relEntries = entries.filter(e => e.release === rel);
            const goLive = go_live_dates[rel];
            return (
              <div
                key={rel}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-3 text-sm truncate">{rel}</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Go-live</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {goLive ? formatDate(parseDate(goLive)) : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Tareas</p>
                    <p className="text-lg font-bold text-gray-700">{relEntries.length}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part 2: Gantt */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Gantt — trabajo paralelo</h2>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {personOrder.map(person => (
            <div key={person} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: personColor[person].hex }}
              />
              {person}
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Gantt header: week markers */}
          <div className="relative border-b border-gray-100 overflow-x-auto">
            <div className="flex" style={{ minWidth: "600px" }}>
              <div className="w-40 flex-shrink-0 px-4 py-2 text-xs font-medium text-gray-500 border-r border-gray-100">
                Release
              </div>
              <div className="flex-1 relative h-8">
                {weekMarkers.map((wm, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: `${pct(wm.date)}%` }}
                  >
                    <div className="border-l border-gray-200 h-full" />
                    <span className="text-xs text-gray-400 ml-1 whitespace-nowrap">{wm.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gantt body */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: "600px" }}>
              {releaseNames.map(rel => {
                const rows = releaseRows[rel];
                const goLive = go_live_dates[rel];
                const goLivePct = goLive ? pct(parseDate(goLive)) : null;
                const swimH = swimlaneHeights[rel];

                return (
                  <div
                    key={rel}
                    className="flex border-b border-gray-100 last:border-b-0"
                    style={{ height: `${swimH}px` }}
                  >
                    {/* Release label */}
                    <div className="w-40 flex-shrink-0 px-4 flex items-center border-r border-gray-100">
                      <span className="text-xs font-medium text-gray-700 truncate">{rel}</span>
                    </div>

                    {/* Task bars */}
                    <div className="flex-1 relative">
                      {/* Week grid lines */}
                      {weekMarkers.map((wm, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-l border-gray-100"
                          style={{ left: `${pct(wm.date)}%` }}
                        />
                      ))}

                      {/* Task rows */}
                      {rows.map((row, rowIdx) =>
                        row.map((entry, entryIdx) => {
                          const left = pct(parseDate(entry.start_date));
                          const right = pct(parseDate(entry.end_date));
                          const width = Math.max(right - left, 0.5);
                          const color = personColor[entry.assigned_to];
                          const top = SWIMLANE_PADDING + HEADER_HEIGHT + rowIdx * ROW_HEIGHT;

                          return (
                            <div
                              key={`${rowIdx}-${entryIdx}`}
                              className={`absolute rounded-md ${color.bg} text-white text-xs flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity overflow-hidden`}
                              style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                top: `${top}px`,
                                height: `${ROW_HEIGHT - 6}px`,
                              }}
                              onMouseEnter={ev => {
                                const rect = (ev.target as HTMLElement)
                                  .closest(".relative")!
                                  .getBoundingClientRect();
                                setTooltip({
                                  entry,
                                  x: ev.clientX - rect.left,
                                  y: ev.clientY - rect.top,
                                });
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <span className="truncate font-medium">{entry.task}</span>
                            </div>
                          );
                        })
                      )}

                      {/* Go-live marker */}
                      {goLivePct !== null && (
                        <div
                          className="absolute top-2 bottom-2 flex flex-col items-center z-10"
                          style={{ left: `${goLivePct}%` }}
                        >
                          <div className="w-0.5 h-full bg-red-500 opacity-60" />
                          <span
                            className="absolute -top-1 text-xs text-red-500 font-bold whitespace-nowrap"
                            style={{ transform: "translateX(-50%)" }}
                          >
                            🚀
                          </span>
                        </div>
                      )}

                      {/* Tooltip */}
                      {tooltip && tooltip.entry.release === rel && (
                        <div
                          className="absolute z-20 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
                          style={{
                            left: `${Math.min(tooltip.x + 10, 70)}%`,
                            top: `${tooltip.y - 60}px`,
                            minWidth: "200px",
                          }}
                        >
                          <p className="font-semibold mb-1">{tooltip.entry.task}</p>
                          <p className="text-gray-300">{tooltip.entry.assigned_to} · {tooltip.entry.role}</p>
                          <p className="text-gray-400 mt-0.5">
                            {formatDate(parseDate(tooltip.entry.start_date))} →{" "}
                            {formatDate(parseDate(tooltip.entry.end_date))}
                          </p>
                          <p className="text-gray-400">{tooltip.entry.duration_days} días</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Part 3: Detail table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Detalle de tareas</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Release
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tarea
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Asignado a
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Inicio
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fin
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Días
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e, i) => {
                  const color = personColor[e.assigned_to];
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-32 truncate">{e.release}</td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{e.task}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-gray-700">{e.assigned_to}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                          {e.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(parseDate(e.start_date))}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(parseDate(e.end_date))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{e.duration_days}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
