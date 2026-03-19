"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Step = "releases" | "analyzing" | "review" | "team" | "scheduling";

interface ReleaseInput {
  id: string;
  name: string;
  rawTasks: string;
  uploadLoading: boolean;
}

interface Task {
  title: string;
  estimated_hours: number;
  role: string;
  added_by_agent: boolean;
}

interface AnalyzedRelease {
  name: string;
  tasks: Task[];
}

const STEPS: { key: Step; label: string }[] = [
  { key: "releases", label: "Releases" },
  { key: "review", label: "Revisión" },
  { key: "team", label: "Equipo" },
  { key: "scheduling", label: "Generando" },
];

const STEP_ORDER: Step[] = ["releases", "analyzing", "review", "team", "scheduling"];

function stepIndex(step: Step): number {
  const display = ["releases", "review", "team", "scheduling"];
  return display.indexOf(step === "analyzing" ? "review" : step);
}

export default function NewReleasePlanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("releases");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const [planName, setPlanName] = useState("");
  const [releases, setReleases] = useState<ReleaseInput[]>([
    { id: crypto.randomUUID(), name: "", rawTasks: "", uploadLoading: false },
  ]);
  const [analyzedReleases, setAnalyzedReleases] = useState<AnalyzedRelease[]>([]);
  const [resources, setResources] = useState<{ name: string; role: string }[]>([
    { name: "", role: "fullstack" },
  ]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);

  function addRelease() {
    setReleases(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: "", rawTasks: "", uploadLoading: false },
    ]);
  }

  function removeRelease(id: string) {
    setReleases(prev => prev.filter(r => r.id !== id));
  }

  async function handleTaskFileUpload(releaseId: string, file: File) {
    setReleases(prev =>
      prev.map(r => (r.id === releaseId ? { ...r, uploadLoading: true } : r))
    );
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/api/extract-tasks`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al procesar el archivo");
      setReleases(prev =>
        prev.map(r =>
          r.id === releaseId
            ? { ...r, rawTasks: data.text, uploadLoading: false }
            : r
        )
      );
    } catch (e) {
      setReleases(prev =>
        prev.map(r => (r.id === releaseId ? { ...r, uploadLoading: false } : r))
      );
      setError(e instanceof Error ? e.message : "Error al procesar el archivo");
    }
  }

  async function analyzeReleases() {
    setStep("analyzing");
    setError("");
    const payload = releases
      .filter(r => r.name.trim())
      .map(r => ({ name: r.name, raw_tasks: r.rawTasks }));
    try {
      const res = await fetch(`${API}/api/releases/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releases: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al analizar");
      setAnalyzedReleases(data.releases);
      setRetry(null);
      setStep("review");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al analizar releases";
      setError(msg);
      setRetry(() => () => analyzeReleases());
      setStep("releases");
    }
  }

  function removeAgentTask(releaseIdx: number, taskIdx: number) {
    setAnalyzedReleases(prev =>
      prev.map((rel, ri) =>
        ri === releaseIdx
          ? { ...rel, tasks: rel.tasks.filter((_, ti) => ti !== taskIdx) }
          : rel
      )
    );
  }

  async function generateSchedule() {
    setStep("scheduling");
    setError("");
    const validResources = resources.filter(r => r.name.trim());
    try {
      const res = await fetch(`${API}/api/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planName || "Plan de releases",
          releases: analyzedReleases,
          resources: validResources,
          start_date: startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al generar");
      router.push(`/releases/${data.plan_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al generar el roadmap";
      setError(msg);
      setRetry(() => () => generateSchedule());
      setStep("team");
    }
  }

  const hasValidReleases = releases.some(r => r.name.trim());

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8 text-sm text-gray-400 flex-wrap">
        {STEPS.map((s, i) => {
          const active = stepIndex(step) >= i;
          return (
            <span key={s.key} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  active ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"
                }`}
              >
                {i + 1}
              </span>
              <span className={active ? "text-gray-700 font-medium" : ""}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="text-gray-300">→</span>}
            </span>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between gap-4">
          <p className="text-red-600 text-sm">{error}</p>
          {retry && (
            <button
              onClick={() => { setError(""); retry(); }}
              className="text-sm font-medium text-red-600 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      )}

      {/* Step: Releases */}
      {step === "releases" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-1">Planear releases</h2>
            <p className="text-gray-500 text-sm mb-5">
              Agrega tus releases y sus tareas. El agente detectará actividades faltantes y armará el roadmap.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan</label>
              <input
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                placeholder="Ej: Q2 2026 — Implementaciones"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {releases.map((release, idx) => (
            <div key={release.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Release {idx + 1}</h3>
                {releases.length > 1 && (
                  <button
                    onClick={() => removeRelease(release.id)}
                    className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la release</label>
                  <input
                    value={release.name}
                    onChange={e =>
                      setReleases(prev =>
                        prev.map(r => (r.id === release.id ? { ...r, name: e.target.value } : r))
                      )
                    }
                    placeholder="Ej: Integración Stripe, Portal de clientes..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Tareas existentes</label>
                    <label className="cursor-pointer text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {release.uploadLoading ? "Procesando..." : "Subir archivo"}
                      <input
                        type="file"
                        accept=".xlsx,.csv,.txt"
                        className="hidden"
                        disabled={release.uploadLoading}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleTaskFileUpload(release.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {release.uploadLoading ? (
                    <div className="w-full border border-indigo-200 bg-indigo-50 rounded-lg px-3 py-6 text-sm text-center text-indigo-500">
                      Extrayendo tareas del archivo...
                    </div>
                  ) : (
                    <textarea
                      value={release.rawTasks}
                      onChange={e =>
                        setReleases(prev =>
                          prev.map(r =>
                            r.id === release.id ? { ...r, rawTasks: e.target.value } : r
                          )
                        )
                      }
                      placeholder="Pega tus tareas aqui, una por linea. Puedes incluir estimaciones."
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              onClick={addRelease}
              className="flex-1 border border-dashed border-gray-300 text-gray-500 py-3 rounded-xl text-sm font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              + Agregar release
            </button>
          </div>

          <button
            onClick={analyzeReleases}
            disabled={!hasValidReleases}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Analizar
          </button>
        </div>
      )}

      {/* Step: Analyzing */}
      {step === "analyzing" && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Analizando releases...</h2>
          <p className="text-gray-500 mt-2 text-sm">
            El agente está revisando las tareas y detectando actividades faltantes
          </p>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-1">Revisión de tareas</h2>
            <p className="text-gray-500 text-sm mb-2">
              El agente completó las tareas faltantes. Revisa y ajusta antes de continuar.
            </p>
            {/* Legend */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
              <span>Agregado por el agente</span>
            </div>
          </div>

          {analyzedReleases.map((rel, ri) => (
            <div key={ri} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">{rel.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{rel.tasks.length} tareas</p>
              </div>
              <div className="divide-y divide-gray-100">
                {rel.tasks.map((task, ti) => (
                  <div key={ti} className="px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {task.added_by_agent && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                      )}
                      <span className="text-sm text-gray-800 truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{task.estimated_hours}h</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        {task.role}
                      </span>
                      {task.added_by_agent && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-medium">
                          ⊕ Agregado
                        </span>
                      )}
                      {task.added_by_agent && (
                        <button
                          onClick={() => removeAgentTask(ri, ti)}
                          className="text-gray-300 hover:text-red-500 text-lg leading-none transition-colors"
                          title="Eliminar sugerencia"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={() => setStep("team")}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Continuar →
          </button>
        </div>
      )}

      {/* Step: Team */}
      {step === "team" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-1">Equipo y fecha de inicio</h2>
          <p className="text-gray-500 text-sm mb-6">
            Dime con quien cuentas y cuando empezamos para armar el roadmap
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Equipo</label>
                <button
                  onClick={() => setResources(prev => [...prev, { name: "", role: "fullstack" }])}
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                >
                  + Agregar persona
                </button>
              </div>
              <div className="space-y-2">
                {resources.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={r.name}
                      onChange={e => {
                        const next = [...resources];
                        next[i] = { ...next[i], name: e.target.value };
                        setResources(next);
                      }}
                      placeholder="Nombre"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <select
                      value={r.role}
                      onChange={e => {
                        const next = [...resources];
                        next[i] = { ...next[i], role: e.target.value };
                        setResources(next);
                      }}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {["fullstack", "backend", "frontend", "devops", "design", "qa"].map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                    {resources.length > 1 && (
                      <button
                        onClick={() => setResources(resources.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 text-lg leading-none transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={generateSchedule}
              disabled={!resources.some(r => r.name.trim()) || !startDate}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-2"
            >
              Generar roadmap
            </button>
          </div>
        </div>
      )}

      {/* Step: Scheduling */}
      {step === "scheduling" && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Generando roadmap...</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Asignando tareas, calculando paralelismo y fechas de go-live
          </p>
        </div>
      )}
    </div>
  );
}
