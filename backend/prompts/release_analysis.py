import json


def build_release_analysis_prompt(releases: list[dict]) -> str:
    releases_text = ""
    for i, r in enumerate(releases, 1):
        releases_text += f"\n--- Release {i}: {r['name']} ---\n"
        if r.get('description'):
            releases_text += f"Descripcion: {r['description']}\n"
        if r.get('raw_tasks', '').strip():
            releases_text += f"Tareas existentes:\n{r['raw_tasks']}\n"
        else:
            releases_text += "Tareas existentes: (ninguna)\n"

    return f"""Analiza estas releases de software. Para cada una:
1. Extrae y estructura las tareas ya existentes (interpreta texto libre, Excel pegado, listas, etc.)
2. Detecta que actividades criticas faltan para poder hacer el release completo a produccion
3. Agrega solo las que faltan — no dupliques lo que ya existe

Actividades que suelen faltar (adapta segun el tipo de proyecto):
- Despliegue por ambiente (dev, staging, produccion)
- Regresion / pruebas funcionales por ambiente
- Configuracion del cliente o tercero
- Smoke tests post-despliegue
- Comunicacion de go-live / documentacion

Releases a analizar:
{releases_text}

Responde SOLO con JSON valido, sin texto adicional:
{{
  "releases": [
    {{
      "name": "nombre exacto de la release",
      "tasks": [
        {{
          "title": "nombre de la tarea",
          "estimated_hours": numero,
          "role": "backend|frontend|fullstack|devops|design|qa",
          "added_by_agent": false
        }}
      ]
    }}
  ]
}}

Para tareas que ya existian: added_by_agent = false
Para tareas que agregas tu: added_by_agent = true
Si no hay estimacion clara, estima razonablemente segun el tipo de tarea."""
