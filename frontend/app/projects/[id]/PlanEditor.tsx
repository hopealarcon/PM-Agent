"use client";

import { useState, useRef, useCallback } from "react";

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

type EditKey = string; // `${table}:${id}:${field}`
type SaveState = "idle" | "saving" | "saved";

interface Props { plan: any }

export default function PlanEditor({ plan: initialPlan }: Props) {
  const [plan, setPlan] = useState(initialPlan);
  const [saveState, setSaveState] = useState<Record<EditKey, SaveState>>({});
  const [editingKey, setEditingKey] = useState<EditKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  const startEdit = (key: EditKey, current: string) => {
    setEditingKey(key);
    setEditValue(current ?? "");
    setTimeout(() => (inputRef.current as HTMLElement)?.focus(), 0);
  };

  const save = useCallback(async (key: EditKey, value: string) => {
    if (key === editingKey) setEditingKey(null);
    const [table, id, field] = key.split(":");
    const original = value;

    // Optimistic update
    setPlan((prev: any) => applyUpdate(prev, table, id, field, value));
    setSaveState(s => ({ ...s, [key]: "saving" }));

    try {
      await fetch(`${API}/api/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, id, fields: { [field]: field === "estimated_hours" ? Number(value) : value } }),
      });
      setSaveState(s => ({ ...s, [key]: "saved" }));
      setTimeout(() => setSaveState(s => { const n = { ...s }; delete n[key]; return n; }), 2000);
    } catch {
      setSaveState(s => ({ ...s, [key]: "idle" }));
      setPlan((prev: any) => applyUpdate(prev, table, id, field, original));
    }
  }, [editingKey]);

  const handleKeyDown = (e: React.KeyboardEvent, key: EditKey) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) save(key, editValue);
    if (e.key === "Escape") setEditingKey(null);
  };

  const totalHours = plan.epics?.flatMap((e: any) =>
    e.features?.flatMap((f: any) => f.tasks?.map((t: any) => t.estimated_hours || 0) ?? []) ?? []
  ).reduce((a: number, b: number) => a + b, 0) ?? 0;

  return (
    <div>
      <p className="text-gray-500 text-sm mt-1 mb-8">
        v{plan.version} · Confianza: <span className="font-medium">{plan.confidence_level}</span> · {totalHours}h estimadas
        <span className="ml-2 text-xs text-gray-400">· Click en cualquier campo para editar</span>
      </p>

      {/* Epics */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Epics y features</h2>
        <div className="space-y-4">
          {plan.epics?.map((epic: any) => {
            const epicHours = epic.features?.flatMap((f: any) => f.tasks?.map((t: any) => t.estimated_hours || 0) ?? []).reduce((a: number, b: number) => a + b, 0) ?? 0;
            return (
              <div key={epic.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <InlineSelect
                      value={epic.priority}
                      options={["must-have", "should-have", "could-have", "wont-have"]}
                      className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColor[epic.priority] || "bg-gray-50 text-gray-500"}`}
                      onChange={v => save(`epics:${epic.id}:priority`, v)}
                      saveState={saveState[`epics:${epic.id}:priority`]}
                    />
                    <InlineText
                      value={epic.title}
                      editingKey={`epics:${epic.id}:title`}
                      activeKey={editingKey}
                      editValue={editValue}
                      saveState={saveState[`epics:${epic.id}:title`]}
                      className="font-semibold text-gray-900"
                      onStart={startEdit}
                      onChange={setEditValue}
                      onSave={save}
                      onKeyDown={handleKeyDown}
                      inputRef={inputRef}
                    />
                  </div>
                  <span className="text-sm text-gray-400 ml-4 flex-shrink-0">{epicHours}h</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {epic.features?.map((feat: any) => {
                    const featHours = feat.tasks?.reduce((a: number, t: any) => a + (t.estimated_hours || 0), 0) ?? 0;
                    return (
                      <div key={feat.id} className="px-5 py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <InlineText
                                value={feat.title}
                                editingKey={`features:${feat.id}:title`}
                                activeKey={editingKey}
                                editValue={editValue}
                                saveState={saveState[`features:${feat.id}:title`]}
                                className="text-sm font-medium text-gray-800"
                                onStart={startEdit}
                                onChange={setEditValue}
                                onSave={save}
                                onKeyDown={handleKeyDown}
                                inputRef={inputRef}
                              />
                              <InlineSelect
                                value={feat.priority}
                                options={["must-have", "should-have", "could-have", "wont-have"]}
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColor[feat.priority] || ""}`}
                                onChange={v => save(`features:${feat.id}:priority`, v)}
                                saveState={saveState[`features:${feat.id}:priority`]}
                              />
                            </div>
                            <InlineText
                              value={feat.description || ""}
                              editingKey={`features:${feat.id}:description`}
                              activeKey={editingKey}
                              editValue={editValue}
                              saveState={saveState[`features:${feat.id}:description`]}
                              className="text-xs text-gray-500 mt-0.5"
                              placeholder="Agregar descripcion..."
                              onStart={startEdit}
                              onChange={setEditValue}
                              onSave={save}
                              onKeyDown={handleKeyDown}
                              inputRef={inputRef}
                            />
                            {feat.tasks?.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {feat.tasks.map((task: any) => (
                                  <div key={task.id} className="flex items-center gap-2 text-xs text-gray-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                    <InlineText
                                      value={task.title}
                                      editingKey={`tasks:${task.id}:title`}
                                      activeKey={editingKey}
                                      editValue={editValue}
                                      saveState={saveState[`tasks:${task.id}:title`]}
                                      className="flex-1"
                                      onStart={startEdit}
                                      onChange={setEditValue}
                                      onSave={save}
                                      onKeyDown={handleKeyDown}
                                      inputRef={inputRef}
                                    />
                                    <InlineSelect
                                      value={task.role || "fullstack"}
                                      options={["backend", "frontend", "fullstack", "devops", "design", "qa"]}
                                      className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-400"
                                      onChange={v => save(`tasks:${task.id}:role`, v)}
                                      saveState={saveState[`tasks:${task.id}:role`]}
                                    />
                                    <InlineNumber
                                      value={task.estimated_hours ?? 0}
                                      editingKey={`tasks:${task.id}:estimated_hours`}
                                      activeKey={editingKey}
                                      editValue={editValue}
                                      saveState={saveState[`tasks:${task.id}:estimated_hours`]}
                                      suffix="h"
                                      onStart={startEdit}
                                      onChange={setEditValue}
                                      onSave={save}
                                      onKeyDown={handleKeyDown}
                                      inputRef={inputRef}
                                    />
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
                <div className="flex items-center justify-between gap-4">
                  <InlineText
                    value={m.name}
                    editingKey={`milestones:${m.id}:name`}
                    activeKey={editingKey}
                    editValue={editValue}
                    saveState={saveState[`milestones:${m.id}:name`]}
                    className="font-medium text-gray-900"
                    onStart={startEdit}
                    onChange={setEditValue}
                    onSave={save}
                    onKeyDown={handleKeyDown}
                    inputRef={inputRef}
                  />
                  <InlineText
                    value={m.target_date || ""}
                    editingKey={`milestones:${m.id}:target_date`}
                    activeKey={editingKey}
                    editValue={editValue}
                    saveState={saveState[`milestones:${m.id}:target_date`]}
                    className="text-sm text-gray-400"
                    placeholder="Fecha..."
                    onStart={startEdit}
                    onChange={setEditValue}
                    onSave={save}
                    onKeyDown={handleKeyDown}
                    inputRef={inputRef}
                  />
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
                  <div className="flex-1 min-w-0">
                    <InlineText
                      value={r.title}
                      editingKey={`risks:${r.id}:title`}
                      activeKey={editingKey}
                      editValue={editValue}
                      saveState={saveState[`risks:${r.id}:title`]}
                      className="font-medium text-gray-900"
                      onStart={startEdit}
                      onChange={setEditValue}
                      onSave={save}
                      onKeyDown={handleKeyDown}
                      inputRef={inputRef}
                    />
                    <InlineText
                      value={r.mitigation || ""}
                      editingKey={`risks:${r.id}:mitigation`}
                      activeKey={editingKey}
                      editValue={editValue}
                      saveState={saveState[`risks:${r.id}:mitigation`]}
                      className="text-sm text-gray-500 mt-1"
                      placeholder="Agregar mitigacion..."
                      onStart={startEdit}
                      onChange={setEditValue}
                      onSave={save}
                      onKeyDown={handleKeyDown}
                      inputRef={inputRef}
                    />
                  </div>
                  <div className="text-xs flex-shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-gray-400">Prob:</span>
                      <InlineSelect
                        value={r.probability}
                        options={["low", "medium", "high"]}
                        className={`font-medium ${riskColor[r.probability]}`}
                        onChange={v => save(`risks:${r.id}:probability`, v)}
                        saveState={saveState[`risks:${r.id}:probability`]}
                      />
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-gray-400">Impacto:</span>
                      <InlineSelect
                        value={r.impact}
                        options={["low", "medium", "high"]}
                        className={`font-medium ${riskColor[r.impact]}`}
                        onChange={v => save(`risks:${r.id}:impact`, v)}
                        saveState={saveState[`risks:${r.id}:impact`]}
                      />
                    </div>
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

// ---- Helper: apply optimistic update to nested plan state ----
function applyUpdate(plan: any, table: string, id: string, field: string, value: string) {
  const update = (arr: any[]) => arr?.map(item => item.id === id ? { ...item, [field]: value } : item);
  if (table === "epics") return { ...plan, epics: update(plan.epics) };
  if (table === "milestones") return { ...plan, milestones: update(plan.milestones) };
  if (table === "risks") return { ...plan, risks: update(plan.risks) };
  if (table === "features") return {
    ...plan, epics: plan.epics?.map((e: any) => ({ ...e, features: update(e.features) }))
  };
  if (table === "tasks") return {
    ...plan, epics: plan.epics?.map((e: any) => ({
      ...e, features: e.features?.map((f: any) => ({ ...f, tasks: update(f.tasks) }))
    }))
  };
  return plan;
}

// ---- Inline edit components ----

function SaveBadge({ state }: { state?: SaveState }) {
  if (state === "saving") return <span className="text-xs text-gray-400 ml-1">...</span>;
  if (state === "saved") return <span className="text-xs text-green-500 ml-1">✓</span>;
  return null;
}

interface InlineTextProps {
  value: string;
  editingKey: string;
  activeKey: string | null;
  editValue: string;
  saveState?: SaveState;
  className?: string;
  placeholder?: string;
  onStart: (key: string, value: string) => void;
  onChange: (v: string) => void;
  onSave: (key: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, key: string) => void;
  inputRef: React.MutableRefObject<any>;
}

function InlineText({ value, editingKey, activeKey, editValue, saveState, className, placeholder, onStart, onChange, onSave, onKeyDown, inputRef }: InlineTextProps) {
  const isEditing = activeKey === editingKey;
  if (isEditing) {
    return (
      <input
        ref={el => { if (el) inputRef.current = el; }}
        value={editValue}
        onChange={e => onChange(e.target.value)}
        onBlur={() => onSave(editingKey, editValue)}
        onKeyDown={e => onKeyDown(e, editingKey)}
        className={`border-b border-indigo-400 outline-none bg-transparent ${className}`}
        style={{ minWidth: "4rem" }}
      />
    );
  }
  return (
    <span className="group inline-flex items-center gap-1">
      <span
        onClick={() => onStart(editingKey, value)}
        className={`cursor-text hover:bg-indigo-50 rounded px-0.5 -mx-0.5 transition-colors ${className} ${!value ? "text-gray-300 italic" : ""}`}
      >
        {value || placeholder || "—"}
      </span>
      <SaveBadge state={saveState} />
    </span>
  );
}

interface InlineNumberProps {
  value: number;
  editingKey: string;
  activeKey: string | null;
  editValue: string;
  saveState?: SaveState;
  suffix?: string;
  onStart: (key: string, value: string) => void;
  onChange: (v: string) => void;
  onSave: (key: string, value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, key: string) => void;
  inputRef: React.MutableRefObject<any>;
}

function InlineNumber({ value, editingKey, activeKey, editValue, saveState, suffix, onStart, onChange, onSave, onKeyDown, inputRef }: InlineNumberProps) {
  const isEditing = activeKey === editingKey;
  if (isEditing) {
    return (
      <input
        ref={el => { if (el) inputRef.current = el; }}
        type="number"
        value={editValue}
        onChange={e => onChange(e.target.value)}
        onBlur={() => onSave(editingKey, editValue)}
        onKeyDown={e => onKeyDown(e, editingKey)}
        className="border-b border-indigo-400 outline-none bg-transparent w-12 text-xs"
      />
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5">
      <span
        onClick={() => onStart(editingKey, String(value))}
        className="cursor-text hover:bg-indigo-50 rounded px-0.5 transition-colors ml-auto"
      >
        {value}{suffix}
      </span>
      <SaveBadge state={saveState} />
    </span>
  );
}

interface InlineSelectProps {
  value: string;
  options: string[];
  className?: string;
  onChange: (v: string) => void;
  saveState?: SaveState;
}

function InlineSelect({ value, options, className, onChange, saveState }: InlineSelectProps) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`cursor-pointer bg-transparent border-none outline-none appearance-none ${className}`}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <SaveBadge state={saveState} />
    </span>
  );
}
