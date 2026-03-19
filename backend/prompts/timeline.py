import json

def build_timeline_prompt(plan: dict, resources: list[dict], start_date: str) -> str:
    scope_items = []
    for epic in plan.get("epics", []):
        for feature in epic.get("features", []):
            tasks = feature.get("tasks", [])
            total_hours = sum(t.get("estimated_hours", 0) or 0 for t in tasks)
            roles = list(set(t.get("role", "fullstack") for t in tasks if t.get("role")))
            scope_items.append({
                "feature": feature["title"],
                "epic": epic["title"],
                "priority": feature.get("priority", "should-have"),
                "estimated_hours": total_hours or 8,
                "roles_needed": roles or ["fullstack"],
            })

    resources_text = "\n".join(f"- {r['name']} ({r['role']})" for r in resources)
    scope_text = json.dumps(scope_items, ensure_ascii=False, indent=2)

    return f"""Fecha de inicio del proyecto: {start_date}

Equipo disponible:
{resources_text}

Features a planificar:
{scope_text}

Genera un timeline considerando:
1. Asigna cada feature al recurso con el rol mas adecuado. Si hay varios con el mismo rol, distribuye la carga.
2. 8 horas estimadas = 1 dia de trabajo. Redondea hacia arriba.
3. Identifica dependencias logicas entre features (ej: autenticacion antes que perfiles, API antes que UI, base de datos antes que logica de negocio).
4. Una persona trabaja en una feature a la vez. Espera a que termine antes de asignarle la siguiente.
5. Prioriza must-have primero, luego should-have, luego could-have.
6. Usa dias calendario (lunes a viernes).

Responde SOLO con JSON en este formato exacto, sin texto adicional:
{{
  "entries": [
    {{
      "feature": "titulo exacto de la feature",
      "epic": "titulo del epic",
      "assigned_to": "nombre del recurso",
      "role": "rol",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "duration_days": numero,
      "dependencies": ["titulo feature 1"],
      "priority": "must-have"
    }}
  ]
}}"""
