"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const priorityColor: Record<string, string> = {
  "must-have": "bg-red-50 text-red-600",
  "should-have": "bg-yellow-50 text-yellow-600",
  "could-have": "bg-gray-50 text-gray-500",
  "wont-have": "bg-gray-50 text-gray-400",
};
const riskColor: Record<string, string> = {
  low: "text-green-600", medium: "text-yellow-600", high: "text-red-600",
};
const priorities = ["must-have", "should-have", "could-have", "wont-have"];
const roles = ["backend", "frontend", "fullstack", "devops", "design", "qa"];
const levels = ["low", "medium", "high"];

interface Props { plan: any }

export default function PlanEditor({ plan: initialPlan }: Props) {
  const [plan, setPlan] = useState(initialPlan);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalHours = plan.epics?.flatMap((e: any) =>
    e.features?.flatMap((f: any) => f.tasks?.map((t: any) => Number(t.estimated_hours) || 0) ?? []) ?? []
  ).reduce((a: number, b: number) => a + b, 0) ?? 0;

  function startEditing() {
    setDraft(JSON.parse(JSON.stringify(plan)));
    setEditing(true);
    setError("");
  }

  function cancelEditing() {
    setDraft(null);
    setEditing(false);
    setError("");
  }

  async function saveChanges() {
    setSaving(true);
    setError("");
    const updates: { table: string; id: string; fields: Record<string, any> }[] = [];

    // Diff epics
    for (const epic of draft.epics ?? []) {
      const orig = plan.epics?.find((e: any) => e.id === epic.id);
      const changed: Record<string, any> = {};
      if (orig?.title !== epic.title) changed.title = epic.title;
      if (orig?.priority !== epic.priority) changed.priority = epic.priority;
      if (orig?.estimated_effort !== epic.estimated_effort) changed.estimated_effort = epic.estimated_effort;
      if (Object.keys(changed).length) updates.push({ table: "epics", id: epic.id, fields: changed });

      for (const feat of epic.features ?? []) {
        const origF = orig?.features?.find((f: any) => f.id === feat.id);
        const changedF: Record<string, any> = {};
        if (origF?.title !== feat.title) changedF.title = feat.title;
        if (origF?.description !== feat.description) changedF.description = feat.description;
        if (origF?.priority !== feat.priority) changedF.priority = feat.priority;
        if (Object.keys(changedF).length) updates.push({ table: "features", id: feat.id, fields: changedF });

        for (const task of feat.tasks ?? []) {
          const origT = origF?.tasks?.find((t: any) => t.id === task.id);
          const changedT: Record<string, any> = {};
          if (origT?.title !== task.title) changedT.title = task.title;
          if (origT?.role !== task.role) changedT.role = task.role;
          if (Number(origT?.estimated_hours) !== Number(task.estimated_hours)) changedT.estimated_hours = Number(task.estimated_hours);
          if (Object.keys(changedT).length) updates.push({ table: "tasks", id: task.id, fields: changedT });
        }
      }
    }
    // Diff milestones
    for (const m of draft.milestones ?? []) {
      const orig = plan.milestones?.find((x: any) => x.id === m.id);
      const changed: Record<string, any> = {};
      if (orig?.name !== m.name) changed.name = m.name;
      if (orig?.target_date !== m.target_date) changed.target_date = m.target_date;
      if (Object.keys(changed).length) updates.push({ table: "milestones", id: m.id, fields: changed });
    }
    // Diff risks
    for (const r of draft.risks ?? []) {
      const orig = plan.risks?.find((x: any) => x.id === r.id);
      const changed: Record<string, any> = {};
      if (orig?.title !== r.title) changed.title = r.title;
      if (orig?.mitigation !== r.mitigation) changed.mitigation = r.mitigation;
      if (orig?.probability !== r.probability) changed.probability = r.probability;
      if (orig?.impact !== r.impact) changed.impact = r.impact;
      if (Object.keys(changed).length) updates.push({ table: "risks", id: r.id, fields: changed });
    }

    try {
      await Promise.all(updates.map(u =>
        fetch(`${API}/api/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u),
        }).then(r => { if (!r.ok) throw new Error("Error guardando"); })
      ));
      setPlan(draft);
      setEditing(false);
      setDraft(null);
    } catch (e) {
      setError("Error guardando cambios. Intenta de nuevo.");
    }
    setSaving(false);
  }

  function setField(path: (string | number)[], value: any) {
    setDraft((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });
  }

  const data = editing ? draft : plan;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          v{plan.version} · Confianza: <span className="font-medium">{plan.confidence_level}</span> · {totalHours}h estimadas
        </p>
        {!editing ? (
          <button
            onClick={startEditing}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16H8v-2a2 2 0 01.586-1.414z" />
            </svg>
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="text-sm font-medium text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>

      {/* Epics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Epics y features</h2>
        <div className="space-y-4">
          {data.epics?.map((epic: any, ei: number) => {
            const epicHours = epic.features?.flatMap((f: any) => f.tasks?.map((t: any) => Number(t.estimated_hours) || 0) ?? []).reduce((a: number, b: number) => a + b, 0) ?? 0;
            return (
              <div key={epic.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {editing ? (
                      <select
                        value={epic.priority}
                        onChange={e => setField(["epics", ei, "priority"], e.target.value)}
                        className={`text-xs px-2 py-0.5 rounded font-medium border border-gray-200 ${priorityColor[epic.priority] || ""}`}
                      >
                        {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColor[epic.priority] || "bg-gray-50 text-gray-500"}`}>{epic.priority}</span>
                    )}
                    {editing ? (
                      <input
                        value={epic.title}
                        onChange={e => setField(["epics", ei, "title"], e.target.value)}
                        className="flex-1 font-semibold text-gray-900 border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    ) : (
                      <h3 className="font-semibold text-gray-900">{epic.title}</h3>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 flex-shrink-0">{epicHours}h</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {epic.features?.map((feat: any, fi: number) => {
                    const featHours = feat.tasks?.reduce((a: number, t: any) => a + (Number(t.estimated_hours) || 0), 0) ?? 0;
                    return (
                      <div key={feat.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {editing ? (
                                <input
                                  value={feat.title}
                                  onChange={e => setField(["epics", ei, "features", fi, "title"], e.target.value)}
                                  className="text-sm font-medium text-gray-800 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-800">{feat.title}</span>
                              )}
                              {editing ? (
                                <select
                                  value={feat.priority}
                                  onChange={e => setField(["epics", ei, "features", fi, "priority"], e.target.value)}
                                  className={`text-xs px-1.5 py-0.5 rounded font-medium border border-gray-200 ${priorityColor[feat.priority] || ""}`}
                                >
                                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              ) : (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColor[feat.priority] || ""}`}>{feat.priority}</span>
                              )}
                            </div>
                            {editing ? (
                              <input
                                value={feat.description || ""}
                                onChange={e => setField(["epics", ei, "features", fi, "description"], e.target.value)}
                                placeholder="Descripcion..."
                                className="mt-1 w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                              />
                            ) : (
                              feat.description && <p className="text-xs text-gray-500 mt-0.5">{feat.description}</p>
                            )}
                            {feat.tasks?.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {feat.tasks.map((task: any, ti: number) => (
                                  <div key={task.id} className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                    {editing ? (
                                      <input
                                        value={task.title}
                                        onChange={e => setField(["epics", ei, "features", fi, "tasks", ti, "title"], e.target.value)}
                                        className="flex-1 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                      />
                                    ) : (
                                      <span className="flex-1">{task.title}</span>
                                    )}
                                    {editing ? (
                                      <select
                                        value={task.role || "fullstack"}
                                        onChange={e => setField(["epics", ei, "features", fi, "tasks", ti, "role"], e.target.value)}
                                        className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-gray-200 focus:outline-none"
                                      >
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                      </select>
                                    ) : (
                                      task.role && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">{task.role}</span>
                                    )}
                                    {editing ? (
                                      <div className="flex items-center gap-0.5 ml-auto">
                                        <input
                                          type="number"
                                          value={task.estimated_hours ?? 0}
                                          onChange={e => setField(["epics", ei, "features", fi, "tasks", ti, "estimated_hours"], e.target.value)}
                                          className="w-14 border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
                                        />
                                        <span className="text-gray-400">h</span>
                                      </div>
                                    ) : (
                                      task.estimated_hours != null && <span className="ml-auto">{task.estimated_hours}h</span>
                                    )}
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
      {data.milestones?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h2>
          <div className="grid gap-3">
            {data.milestones.map((m: any, mi: number) => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  {editing ? (
                    <input
                      value={m.name}
                      onChange={e => setField(["milestones", mi, "name"], e.target.value)}
                      className="font-medium text-gray-900 border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1"
                    />
                  ) : (
                    <h3 className="font-medium text-gray-900">{m.name}</h3>
                  )}
                  {editing ? (
                    <input
                      value={m.target_date || ""}
                      onChange={e => setField(["milestones", mi, "target_date"], e.target.value)}
                      placeholder="Ej: Semana 4"
                      className="text-sm text-gray-400 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32"
                    />
                  ) : (
                    m.target_date && <span className="text-sm text-gray-400">{m.target_date}</span>
                  )}
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
      {data.risks?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Riesgos</h2>
          <div className="grid gap-3">
            {data.risks.map((r: any, ri: number) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {editing ? (
                      <input
                        value={r.title}
                        onChange={e => setField(["risks", ri, "title"], e.target.value)}
                        className="font-medium text-gray-900 border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                      />
                    ) : (
                      <h3 className="font-medium text-gray-900">{r.title}</h3>
                    )}
                    {editing ? (
                      <input
                        value={r.mitigation || ""}
                        onChange={e => setField(["risks", ri, "mitigation"], e.target.value)}
                        placeholder="Mitigacion..."
                        className="mt-1 text-sm text-gray-500 border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full"
                      />
                    ) : (
                      r.mitigation && <p className="text-sm text-gray-500 mt-1">{r.mitigation}</p>
                    )}
                  </div>
                  <div className="text-xs flex-shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-gray-400">Prob:</span>
                      {editing ? (
                        <select
                          value={r.probability}
                          onChange={e => setField(["risks", ri, "probability"], e.target.value)}
                          className={`font-medium border border-gray-200 rounded px-1 focus:outline-none ${riskColor[r.probability]}`}
                        >
                          {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      ) : (
                        <span className={`font-medium ${riskColor[r.probability]}`}>{r.probability}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-gray-400">Impacto:</span>
                      {editing ? (
                        <select
                          value={r.impact}
                          onChange={e => setField(["risks", ri, "impact"], e.target.value)}
                          className={`font-medium border border-gray-200 rounded px-1 focus:outline-none ${riskColor[r.impact]}`}
                        >
                          {levels.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      ) : (
                        <span className={`font-medium ${riskColor[r.impact]}`}>{r.impact}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Save bar at bottom when editing */}
      {editing && (
        <div className="sticky bottom-4 flex justify-end gap-2 pt-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button onClick={cancelEditing} disabled={saving} className="text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="text-sm font-medium text-white bg-indigo-600 px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
