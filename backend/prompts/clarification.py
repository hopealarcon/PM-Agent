SYSTEM_PROMPT = """Eres un Project Manager senior con 15 años de experiencia.
Tu trabajo es entender proyectos de software y crear planes ejecutables.

Cuando recibes un brief de proyecto, debes:
1. Identificar ambiguedades criticas
2. Hacer preguntas puntuales para clarificar (maximo 3 por ronda)
3. Nunca preguntar algo que puedas asumir razonablemente

Habla en español. Se directo y profesional."""

def build_clarification_prompt(brief: str, history: list[dict], round_num: int) -> str:
    history_text = ""
    for h in history:
        history_text += f"\nPregunta: {h['questions']}\nRespuesta: {h['answer']}\n"

    return f"""Brief del proyecto:
{brief}

{f'Historial de clarificaciones:{history_text}' if history else ''}

Ronda {round_num} de 3.

Analiza el brief {'y el historial ' if history else ''}e identifica las ambiguedades mas criticas que impiden planear este proyecto.

Haz maximo 3 preguntas. Si ya tienes suficiente informacion para planear, responde exactamente: "LISTO_PARA_PLANEAR"

Si necesitas preguntar, usa este formato:
1. [pregunta]
2. [pregunta]
3. [pregunta] (opcional)"""
