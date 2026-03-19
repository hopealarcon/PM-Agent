import Link from "next/link";
import { notFound } from "next/navigation";
import ReleasesRoadmap from "./ReleasesRoadmap";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Entry {
  release: string;
  task: string;
  assigned_to: string;
  role: string;
  start_date: string;
  end_date: string;
  duration_days: number;
}

interface ReleasePlan {
  id: string;
  name: string;
  releases: { name: string; tasks: unknown[] }[];
  resources: { name: string; role: string }[];
  start_date: string;
  schedule_entries: Entry[];
  go_live_dates: Record<string, string>;
  created_at: string;
}

async function getReleasePlan(id: string): Promise<ReleasePlan | null> {
  try {
    const res = await fetch(`${API}/api/releases/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ReleasePlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getReleasePlan(id);

  if (!plan) notFound();

  const entries = plan.schedule_entries || [];
  const releaseNames = Array.from(new Set(entries.map((e: Entry) => e.release)));

  // Date range for header
  const allDates = entries.flatMap((e: Entry) => [e.start_date, e.end_date]);
  const minDate = allDates.length > 0 ? allDates.reduce((a, b) => (a < b ? a : b)) : null;
  const maxDate = allDates.length > 0 ? allDates.reduce((a, b) => (a > b ? a : b)) : null;

  function fmtDate(s: string | null) {
    if (!s) return "—";
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Proyectos
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{releaseNames.length} releases</span>
              {minDate && maxDate && (
                <>
                  <span>·</span>
                  <span>
                    {fmtDate(minDate)} — {fmtDate(maxDate)}
                  </span>
                </>
              )}
            </div>
          </div>
          <span className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full font-medium flex-shrink-0">
            release plan
          </span>
        </div>
      </div>

      {/* Roadmap */}
      <ReleasesRoadmap
        entries={entries}
        go_live_dates={plan.go_live_dates || {}}
        resources={plan.resources || []}
      />
    </div>
  );
}
