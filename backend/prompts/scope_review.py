SYSTEM_PROMPT = """Eres un Project Manager senior. Propones el scope de proyectos de software
basandote en el brief y las clarificaciones del cliente.

Siempre incluyes features implicitas que se suelen olvidar: autenticacion, manejo de errores,
testing, deployment, logging, seguridad basica.

Habla en español. Se directo y profesional."""

def build_epics_prompt(brief: str, clarifications: list[dict], document_context: str = "") -> str:
    clarifications_text = ""
    for c in clarifications:
        clarifications_text += f"\nP: {c['questions']}\nR: {c['answer']}\n"

    doc_section = f"\nDocumento de requerimientos:\n{document_context}\n" if document_context else ""

    return f"""Brief: {brief}
{doc_section}
Clarificaciones:{clarifications_text}

Propone las areas de trabajo principales (epics) para este proyecto.
Lista entre 4 y 8 epics. Incluye epics tecnicos implicitos que se suelen olvidar.

Formato:
[A] Nombre del epic - descripcion breve
[B] Nombre del epic - descripcion breve
...

Al final agrega:
IMPLICITOS: lista los epics que agregaste por ser buenas practicas y no porque el cliente los menciono."""


def build_features_prompt(epic_title: str, brief: str, clarifications: list[dict], document_context: str = "") -> str:
    clarifications_text = ""
    for c in clarifications:
        clarifications_text += f"\nP: {c['questions']}\nR: {c['answer']}\n"

    doc_section = f"\nDocumento de requerimientos:\n{document_context}\n" if document_context else ""

    return f"""Brief: {brief}
{doc_section}
Clarificaciones:{clarifications_text}

Para el epic "{epic_title}", lista las features especificas.
Entre 3 y 6 features por epic.

Formato:
[1] Nombre feature - descripcion breve (must-have/should-have/could-have)
[2] Nombre feature - descripcion breve (must-have/should-have/could-have)
..."""
