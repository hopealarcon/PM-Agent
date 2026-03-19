import json

SYSTEM_PROMPT = """Eres un Project Manager senior. Generas planes de proyecto detallados y ejecutables.

Para cada feature aprobada, defines tasks concretas con estimados realistas.
Identificas riesgos reales con mitigaciones concretas (no genericas).
Propones milestones alcanzables basados en el scope.

Habla en español. Se directo y profesional."""

def build_plan_prompt(brief: str, clarifications: list[dict], accepted_scope: dict, document_context: str = "") -> str:
    clarifications_text = ""
    for c in clarifications:
        clarifications_text += f"\nP: {c['questions']}\nR: {c['answer']}\n"

    scope_text = json.dumps(accepted_scope, ensure_ascii=False, indent=2)
    doc_section = f"\nDocumento de requerimientos:\n{document_context}\n" if document_context else ""

    return f"""Brief: {brief}
{doc_section}
Clarificaciones:{clarifications_text}

Scope aprobado:
{scope_text}

Genera el plan de proyecto completo en formato JSON con esta estructura exacta:

{{
  "confidence_level": "low|medium|high",
  "epics": [
    {{
      "title": "string",
      "priority": "must-have|should-have|could-have|wont-have",
      "estimated_effort": "string (ej: '3-5 dias')",
      "features": [
        {{
          "title": "string",
          "description": "string",
          "priority": "must-have|should-have|could-have|wont-have",
          "tasks": [
            {{
              "title": "string",
              "estimated_hours": number,
              "role": "backend|frontend|fullstack|devops|design|qa"
            }}
          ]
        }}
      ]
    }}
  ],
  "risks": [
    {{
      "title": "string",
      "probability": "low|medium|high",
      "impact": "low|medium|high",
      "mitigation": "string"
    }}
  ],
  "milestones": [
    {{
      "name": "string",
      "target_date": "string (ej: 'Semana 4')",
      "gate_criteria": ["criterio 1", "criterio 2"]
    }}
  ]
}}

Responde SOLO con el JSON, sin texto adicional."""
