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

export default async function HomePage() {
  const projects = await getProjects();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-500 mt-1">Planes de proyecto generados por IA</p>
        </div>
        <Link
          href="/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Nuevo proyecto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
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
  );
}
