import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const priorityColor: Record<string, string> = {
  "must-have": "bg-red-50 text-red-600",
  "should-have": "bg-yellow-50 text-yellow-600",
  "could-have": "bg-gray-50 text-gray-500",
  "wont-have": "bg-gray-50 text-gray-400",
};

const riskColor: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-600",
};

async function getPlan(id: string) {
  const res = await fetch(`${API}/api/projects/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlan(id);

  if (!plan) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Plan no encontrado.</p>
        <Link href="/" className="text-indigo-600 mt-4 inline-block hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  const totalHours = plan.epics?.flatMap((e: any) =>
    e.features?.flatMap((f: any) =>
      f.tasks?.map((t: any) => t.estimated_hours || 0) ?? []
    ) ?? []
  ).reduce((a: number, b: number) => a + b, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Proyectos</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Plan del proyecto</h1>
          <p className="text-gray-500 text-sm mt-1">
            v{plan.version} · Confianza: <span className="font-medium">{plan.confidence_level}</span> · {totalHours}h estimadas
          </p>
        </div>
      </div>

      {/* Epics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Epics y features</h2>
        <div className="space-y-4">
          {plan.epics?.map((epic: any) => {
            const epicHours = epic.features?.flatMap((f: any) => f.tasks?.map((t: any) => t.estimated_hours || 0) ?? []).reduce((a: number, b: number) => a + b, 0) ?? 0;
            return (
              <div key={epic.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColor[epic.priority] || "bg-gray-50 text-gray-500"}`}>
                      {epic.priority}
                    </span>
                    <h3 className="font-semibold text-gray-900">{epic.title}</h3>
                  </div>
                  <span className="text-sm text-gray-400">{epicHours}h</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {epic.features?.map((feat: any) => {
                    const featHours = feat.tasks?.reduce((a: number, t: any) => a + (t.estimated_hours || 0), 0) ?? 0;
                    return (
                      <div key={feat.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{feat.title}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColor[feat.priority] || ""}`}>
                                {feat.priority}
                              </span>
                            </div>
                            {feat.description && <p className="text-xs text-gray-500 mt-0.5">{feat.description}</p>}
                            {feat.tasks?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {feat.tasks.map((task: any) => (
                                  <div key={task.id} className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                    <span>{task.title}</span>
                                    {task.role && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">{task.role}</span>}
                                    {task.estimated_hours && <span className="ml-auto">{task.estimated_hours}h</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {featHours > 0 && <span className="text-sm text-gray-400 flex-shrink-0">{featHours}h</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Milestones */}
      {plan.milestones?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h2>
          <div className="grid gap-3">
            {plan.milestones.map((m: any) => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{m.name}</h3>
                  {m.target_date && <span className="text-sm text-gray-400">{m.target_date}</span>}
                </div>
                {m.gate_criteria?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {m.gate_criteria.map((c: string, i: number) => (
                      <li key={i} className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="text-green-500">✓</span> {c}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Risks */}
      {plan.risks?.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Riesgos</h2>
          <div className="grid gap-3">
            {plan.risks.map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{r.title}</h3>
                    {r.mitigation && <p className="text-sm text-gray-500 mt-1">{r.mitigation}</p>}
                  </div>
                  <div className="text-xs flex-shrink-0 text-right">
                    <p>Prob: <span className={`font-medium ${riskColor[r.probability]}`}>{r.probability}</span></p>
                    <p>Impacto: <span className={`font-medium ${riskColor[r.impact]}`}>{r.impact}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
