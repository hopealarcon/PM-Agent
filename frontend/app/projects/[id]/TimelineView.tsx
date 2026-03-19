"use client";

interface Entry {
  feature: string;
  epic: string;
  assigned_to: string;
  role: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  dependencies: string[];
  priority: string;
}

interface Props {
  entries: Entry[];
  resources: { name: string; role: string }[];
  start_date: string;
}

const priorityColor: Record<string, string> = {
  "must-have": "bg-red-400",
  "should-have": "bg-yellow-400",
  "could-have": "bg-blue-300",
  "wont-have": "bg-gray-300",
};

const priorityBadge: Record<string, string> = {
  "must-have": "bg-red-50 text-red-600",
  "should-have": "bg-yellow-50 text-yellow-600",
  "could-have": "bg-blue-50 text-blue-500",
  "wont-have": "bg-gray-50 text-gray-400",
};

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}

function formatDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function weekLabel(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function TimelineView({ entries, resources, start_date }: Props) {
  if (!entries.length) return <p className="text-gray-400 text-sm">No hay timeline disponible.</p>;

  const dates = entries.flatMap(e => [parseDate(e.start_date), parseDate(e.end_date)]);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const totalDays = Math.max(1, (maxDate.getTime() - minDate.getTime()) / 86400000) + 1;

  // Build week markers
  const weeks: { date: Date; label: string; pct: number }[] = [];
  let cur = new Date(minDate);
  while (cur <= maxDate) {
    const pct = ((cur.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100;
    weeks.push({ date: new Date(cur), label: weekLabel(cur), pct });
    cur = addDays(cur, 7);
  }

  // Group by person
  const people = Array.from(new Set(entries.map(e => e.assigned_to)));

  function bar(e: Entry) {
    const start = parseDate(e.start_date);
    const end = parseDate(e.end_date);
    const left = ((start.getTime() - minDate.getTime()) / 86400000 / totalDays) * 100;
    const width = Math.max(
      ((end.getTime() - start.getTime()) / 86400000 + 1) / totalDays * 100,
      1.5
    );
    return { left, width };
  }

  return (
    <div className="space-y-6">
      {/* Gantt */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Gantt</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDate(minDate)} → {formatDate(maxDate)} · {Math.round(totalDays)} días
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Week headers */}
            <div className="flex border-b border-gray-100 bg-gray-50">
              <div className="w-36 flex-shrink-0 px-3 py-2 text-xs text-gray-400 font-medium">Persona</div>
              <div className="flex-1 relative h-8">
                {weeks.map((w, i) => (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center text-xs text-gray-400 border-l border-gray-200"
                    style={{ left: `${w.pct}%` }}
                  >
                    <span className="pl-1">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rows per person */}
            {people.map(person => {
              const personEntries = entries.filter(e => e.assigned_to === person);
              return (
                <div key={person} className="flex border-b border-gray-50 hover:bg-gray-50/50">
                  <div className="w-36 flex-shrink-0 px-3 py-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{person}</p>
                    <p className="text-xs text-gray-400">{personEntries[0]?.role}</p>
                  </div>
                  <div className="flex-1 relative" style={{ height: `${Math.max(personEntries.length, 1) * 36 + 16}px` }}>
                    {/* Week grid lines */}
                    {weeks.map((w, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-l border-gray-100"
                        style={{ left: `${w.pct}%` }}
                      />
                    ))}
                    {personEntries.map((e, idx) => {
                      const { left, width } = bar(e);
                      return (
                        <div
                          key={idx}
                          className="absolute flex items-center"
                          style={{ left: `${left}%`, width: `${width}%`, top: `${8 + idx * 36}px`, height: "28px" }}
                          title={`${e.feature}\n${formatDate(parseDate(e.start_date))} → ${formatDate(parseDate(e.end_date))}\n${e.duration_days}d${e.dependencies.length ? `\nDeps: ${e.dependencies.join(", ")}` : ""}`}
                        >
                          <div className={`w-full h-full rounded flex items-center px-2 ${priorityColor[e.priority] || "bg-indigo-400"} bg-opacity-80`}>
                            <span className="text-white text-xs font-medium truncate">{e.feature}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="px-5 py-3 flex items-center gap-4 border-t border-gray-100 flex-wrap">
          {Object.entries(priorityColor).map(([p, c]) => (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${c}`} />
              <span className="text-xs text-gray-500">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Detalle de asignaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                <th className="text-left px-4 py-2">Feature</th>
                <th className="text-left px-4 py-2">Epic</th>
                <th className="text-left px-4 py-2">Asignado a</th>
                <th className="text-left px-4 py-2">Inicio</th>
                <th className="text-left px-4 py-2">Fin</th>
                <th className="text-left px-4 py-2">Días</th>
                <th className="text-left px-4 py-2">Prioridad</th>
                <th className="text-left px-4 py-2">Dependencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries
                .slice()
                .sort((a, b) => a.start_date.localeCompare(b.start_date))
                .map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{e.feature}</td>
                    <td className="px-4 py-2.5 text-gray-500">{e.epic}</td>
                    <td className="px-4 py-2.5 text-gray-700">{e.assigned_to}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(parseDate(e.start_date))}</td>
                    <td className="px-4 py-2.5 text-gray-500">{formatDate(parseDate(e.end_date))}</td>
                    <td className="px-4 py-2.5 text-gray-500">{e.duration_days}d</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityBadge[e.priority] || ""}`}>
                        {e.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{e.dependencies?.join(", ") || "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
