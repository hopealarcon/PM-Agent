import json


def build_release_schedule_prompt(releases: list[dict], resources: list[dict], start_date: str) -> str:
    resources_text = "\n".join(f"- {r['name']} ({r['role']})" for r in resources)

    releases_text = json.dumps([
        {
            "name": r["name"],
            "tasks": [
                {
                    "title": t["title"],
                    "estimated_hours": t.get("estimated_hours", 8),
                    "role": t.get("role", "fullstack")
                }
                for t in r.get("tasks", [])
            ]
        }
        for r in releases
    ], ensure_ascii=False, indent=2)

    return f"""Fecha de inicio: {start_date}

Equipo:
{resources_text}

Releases a planificar (pueden trabajarse en paralelo):
{releases_text}

Genera el schedule considerando:
1. El equipo puede trabajar en multiples releases en paralelo — personas distintas, releases distintas
2. Una persona solo puede trabajar en UNA tarea a la vez
3. Dentro de cada release, respeta el orden logico: desarrollo → configuracion → despliegue staging → regresion → despliegue prod → smoke test
4. Asigna cada tarea al recurso con el rol mas adecuado. Distribuye la carga entre personas del mismo rol
5. 8 horas = 1 dia laboral. Usa dias de lunes a viernes
6. La go_live_date de cada release es cuando terminan TODAS sus tareas

Responde SOLO con JSON valido:
{{
  "entries": [
    {{
      "release": "nombre de la release",
      "task": "nombre de la tarea",
      "assigned_to": "nombre del recurso",
      "role": "rol",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "duration_days": numero
    }}
  ],
  "go_live_dates": {{
    "nombre release": "YYYY-MM-DD"
  }}
}}"""
