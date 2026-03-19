import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getProjects() {
  try {
    const res = await fetch(`${API}/api/projects`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function getReleasePlans() {
  try {
    const res = await fetch(`${API}/api/releases`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [projects, releasePlans] = await Promise.all([getProjects(), getReleasePlans()]);

  return (
    <div className="space-y-10">
      {/* Projects section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
            <p className="text-gray-500 mt-1">Planes de proyecto generados por IA</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/releases/new"
              className="border border-indigo-300 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
            >
              Planear releases
            </Link>
            <Link
              href="/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              + Nuevo proyecto
            </Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-gray-500 text-lg">No hay proyectos todavia</p>
            <Link href="/new" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">
              Crea tu primer proyecto
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((p: { id: string; name: string; status: string; created_at: string }) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{p.name}</h2>
                    <p className="text-sm text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString("es-ES")}</p>
                  </div>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                    {p.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Release plans section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Planes de release</h2>
            <p className="text-gray-500 mt-1">Roadmaps generados por IA con asignacion de equipo</p>
          </div>
          <Link
            href="/releases/new"
            className="border border-violet-300 text-violet-600 bg-violet-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-100 transition-colors"
          >
            + Planear releases
          </Link>
        </div>

        {releasePlans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-3xl mb-3">🗓️</p>
            <p className="text-gray-500">No hay planes de release todavia</p>
            <Link href="/releases/new" className="mt-3 inline-block text-violet-600 font-medium hover:underline text-sm">
              Crea tu primer plan de release
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {releasePlans.map((p: { id: string; name: string; created_at: string }) => (
              <Link
                key={p.id}
                href={`/releases/${p.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-violet-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString("es-ES")}</p>
                  </div>
                  <span className="text-xs bg-violet-50 text-violet-700 px-2 py-1 rounded-full font-medium">
                    release plan
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
