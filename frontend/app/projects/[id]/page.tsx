import Link from "next/link";
import TimelineView from "./TimelineView";
import PlanEditor from "./PlanEditor";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


async function getPlan(id: string) {
  const res = await fetch(`${API}/api/projects/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getTimeline(id: string) {
  try {
    const res = await fetch(`${API}/api/timeline/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "plan" } = await searchParams;
  const [plan, timeline] = await Promise.all([getPlan(id), getTimeline(id)]);

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

  const hasTimeline = timeline?.entries?.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Proyectos</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Plan del proyecto</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          href={`/projects/${id}?tab=plan`}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${tab === "plan" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Plan
        </Link>
        <Link
          href={`/projects/${id}?tab=timeline`}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${tab === "timeline" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Timeline {hasTimeline ? "" : <span className="text-xs text-gray-300 ml-1">—</span>}
        </Link>
      </div>

      {/* Tab: Plan */}
      {tab !== "timeline" && <PlanEditor plan={plan} />}

      {/* Tab: Timeline */}
      {tab === "timeline" && (
        hasTimeline
          ? <TimelineView entries={timeline.entries} resources={timeline.resources} start_date={timeline.start_date} />
          : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm mb-3">No se ha generado un timeline para este proyecto aun.</p>
              <Link href="/" className="text-indigo-600 text-sm hover:underline">Volver al inicio</Link>
            </div>
          )
      )}
    </div>
  );
}
