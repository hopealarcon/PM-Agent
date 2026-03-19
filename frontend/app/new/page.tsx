"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Step = "brief" | "clarify" | "scope-epics" | "scope-features" | "generating" | "done";

interface Epic { key: string; title: string; description: string; }
interface Feature { title: string; description: string; priority: string; }
interface ScopeDecision { feature: string; decision: string; reason?: string; }

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("brief");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<(() => void) | null>(null);

  // Brief
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");

  // Clarification
  const [history, setHistory] = useState<{ questions: string; answer: string }[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");

  // Scope - epics
  const [proposedEpics, setProposedEpics] = useState<Epic[]>([]);
  const [acceptedEpics, setAcceptedEpics] = useState<Set<string>>(new Set());

  // Scope - features
  const [currentEpicIndex, setCurrentEpicIndex] = useState(0);
  const [proposedFeatures, setProposedFeatures] = useState<Feature[]>([]);
  const [acceptedFeatures, setAcceptedFeatures] = useState<Set<string>>(new Set());
  const [acceptedScope, setAcceptedScope] = useState<Record<string, Feature[]>>({});
  const [allDecisions, setAllDecisions] = useState<ScopeDecision[]>([]);

  async function startClarification() {
    if (!name.trim() || !brief.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, history: [] }),
      });
      const data = await res.json();
      if (data.ready) {
        await loadEpics();
      } else {
        setCurrentQuestions(data.questions);
        setStep("clarify");
      }
    } catch {
      setError("Error conectando con el servidor.");
    }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!currentAnswer.trim()) return;
    setLoading(true);
    const newHistory = [...history, { questions: currentQuestions, answer: currentAnswer }];
    setHistory(newHistory);
    setCurrentAnswer("");

    if (newHistory.length >= 3) {
      await loadEpics(newHistory);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, history: newHistory }),
      });
      const data = await res.json();
      if (data.ready) {
        await loadEpics(newHistory);
      } else {
        setCurrentQuestions(data.questions);
      }
    } catch {
      setError("Error conectando con el servidor.");
    }
    setLoading(false);
  }

  async function loadEpics(clarifications = history) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/scope/epics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, clarifications }),
      });
      const data = await res.json();
      setProposedEpics(data.epics);
      setAcceptedEpics(new Set(data.epics.map((e: Epic) => e.title)));
      setRetry(null);
      setStep("scope-epics");
    } catch {
      setError("Error generando las areas de trabajo.");
      setRetry(() => () => loadEpics(clarifications));
    }
    setLoading(false);
  }

  async function confirmEpics() {
    const accepted = proposedEpics.filter(e => acceptedEpics.has(e.title));
    const decisions: ScopeDecision[] = proposedEpics.map(e => ({
      feature: e.title,
      decision: acceptedEpics.has(e.title) ? "accepted" : "rejected",
    }));
    setAllDecisions(decisions);

    // Load features for first epic
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/scope/features`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epic_title: accepted[0].title, brief, clarifications: history }),
      });
      const data = await res.json();
      setProposedFeatures(data.features);
      setAcceptedFeatures(new Set(data.features.map((f: Feature) => f.title)));
      setCurrentEpicIndex(0);
      setRetry(null);
      setStep("scope-features");
    } catch {
      setError("Error generando features.");
      setRetry(() => () => confirmEpics());
    }
    setLoading(false);
  }

  async function confirmFeatures() {
    const acceptedEpicsList = proposedEpics.filter(e => acceptedEpics.has(e.title));
    const currentEpic = acceptedEpicsList[currentEpicIndex];
    const accepted = proposedFeatures.filter(f => acceptedFeatures.has(f.title));

    const newScope = { ...acceptedScope, [currentEpic.title]: accepted };
    setAcceptedScope(newScope);

    const featDecisions: ScopeDecision[] = proposedFeatures.map(f => ({
      feature: f.title,
      decision: acceptedFeatures.has(f.title) ? "accepted" : "rejected",
    }));
    const newDecisions = [...allDecisions, ...featDecisions];
    setAllDecisions(newDecisions);

    const nextIndex = currentEpicIndex + 1;
    if (nextIndex < acceptedEpicsList.length) {
      const loadNextFeatures = async () => {
        setLoading(true);
        setError("");
        try {
          const res = await fetch(`${API}/api/scope/features`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ epic_title: acceptedEpicsList[nextIndex].title, brief, clarifications: history }),
          });
          const data = await res.json();
          setProposedFeatures(data.features);
          setAcceptedFeatures(new Set(data.features.map((f: Feature) => f.title)));
          setCurrentEpicIndex(nextIndex);
          setRetry(null);
        } catch {
          setError("Error generando features.");
          setRetry(() => () => loadNextFeatures());
        }
        setLoading(false);
      };
      await loadNextFeatures();
    } else {
      await generatePlan(newScope, newDecisions);
    }
  }

  async function generatePlan(scope = acceptedScope, decisions = allDecisions) {
    setStep("generating");
    try {
      const res = await fetch(`${API}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          brief,
          clarifications: history,
          accepted_scope: scope,
          scope_decisions: decisions,
        }),
      });
      const data = await res.json();
      router.push(`/projects/${data.project_id}`);
    } catch {
      setError("Error generando el plan.");
      setStep("scope-features");
    }
  }

  const acceptedEpicsList = proposedEpics.filter(e => acceptedEpics.has(e.title));
  const currentEpic = acceptedEpicsList[currentEpicIndex];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 text-sm text-gray-400">
        {["Brief", "Clarificacion", "Epics", "Features", "Generando"].map((label, i) => {
          const steps: Step[] = ["brief", "clarify", "scope-epics", "scope-features", "generating"];
          const active = steps.indexOf(step) >= i;
          return (
            <span key={label} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${active ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"}`}>{i + 1}</span>
              <span className={active ? "text-gray-700 font-medium" : ""}>{label}</span>
              {i < 4 && <span className="text-gray-300">→</span>}
            </span>
          );
        })}
      </div>

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

      {/* Step: Brief */}
      {step === "brief" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-1">Nuevo proyecto</h2>
          <p className="text-gray-500 text-sm mb-6">Describeme el proyecto y yo me encargo del resto</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del proyecto</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: App de gestion de inventario"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion del proyecto</label>
              <textarea
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder="Describe que quieres construir, para quien, y cualquier detalle relevante..."
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
            <button
              onClick={startClarification}
              disabled={loading || !name.trim() || !brief.trim()}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Analizando..." : "Continuar"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Clarify */}
      {step === "clarify" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-1">Algunas preguntas</h2>
          <p className="text-gray-500 text-sm mb-6">Ronda {history.length + 1} de 3</p>

          {history.map((h, i) => (
            <div key={i} className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="text-gray-500 whitespace-pre-wrap">{h.questions}</p>
              <p className="text-gray-900 mt-2 font-medium">Tu: {h.answer}</p>
            </div>
          ))}

          <div className="p-4 bg-indigo-50 rounded-lg mb-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentQuestions}</p>
          </div>
          <textarea
            value={currentAnswer}
            onChange={e => setCurrentAnswer(e.target.value)}
            placeholder="Tu respuesta..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
          />
          <div className="flex gap-3">
            <button
              onClick={submitAnswer}
              disabled={loading || !currentAnswer.trim()}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Procesando..." : "Responder"}
            </button>
            <button
              onClick={() => loadEpics()}
              disabled={loading}
              className="text-gray-500 text-sm hover:text-gray-700 px-3"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {/* Step: Scope Epics */}
      {step === "scope-epics" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-1">Areas de trabajo</h2>
          <p className="text-gray-500 text-sm mb-6">Selecciona las areas que quieres incluir en el proyecto</p>
          <div className="space-y-2 mb-6">
            {proposedEpics.map(epic => (
              <label key={epic.title} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={acceptedEpics.has(epic.title)}
                  onChange={e => {
                    const next = new Set(acceptedEpics);
                    e.target.checked ? next.add(epic.title) : next.delete(epic.title);
                    setAcceptedEpics(next);
                  }}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <p className="font-medium text-sm text-gray-900">{epic.title}</p>
                  {epic.description && <p className="text-xs text-gray-500 mt-0.5">{epic.description}</p>}
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={confirmEpics}
            disabled={loading || acceptedEpics.size === 0}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Cargando features..." : `Confirmar ${acceptedEpics.size} areas`}
          </button>
        </div>
      )}

      {/* Step: Scope Features */}
      {step === "scope-features" && currentEpic && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-semibold">{currentEpic.title}</h2>
            <span className="text-sm text-gray-400">{currentEpicIndex + 1} / {acceptedEpicsList.length}</span>
          </div>
          <p className="text-gray-500 text-sm mb-6">Selecciona las features de esta area</p>
          <div className="space-y-2 mb-6">
            {proposedFeatures.map(feat => (
              <label key={feat.title} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={acceptedFeatures.has(feat.title)}
                  onChange={e => {
                    const next = new Set(acceptedFeatures);
                    e.target.checked ? next.add(feat.title) : next.delete(feat.title);
                    setAcceptedFeatures(next);
                  }}
                  className="mt-0.5 accent-indigo-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-gray-900">{feat.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${feat.priority === "must-have" ? "bg-red-50 text-red-600" : feat.priority === "should-have" ? "bg-yellow-50 text-yellow-600" : "bg-gray-50 text-gray-500"}`}>
                      {feat.priority}
                    </span>
                  </div>
                  {feat.description && <p className="text-xs text-gray-500 mt-0.5">{feat.description}</p>}
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={confirmFeatures}
            disabled={loading || acceptedFeatures.size === 0}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Cargando..." : currentEpicIndex + 1 < acceptedEpicsList.length ? "Siguiente area →" : "Generar plan"}
          </button>
        </div>
      )}

      {/* Step: Generating */}
      {step === "generating" && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Generando plan...</h2>
          <p className="text-gray-500 mt-2 text-sm">El agente esta analizando el scope y creando el plan detallado</p>
        </div>
      )}
    </div>
  );
}
