import os
import anthropic
from dotenv import load_dotenv
from prompts.clarification import SYSTEM_PROMPT, build_clarification_prompt

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def run_clarification(brief: str, history: list[dict]) -> tuple[str, bool]:
    """
    Returns (questions_text, is_ready_to_plan)
    """
    round_num = len(history) + 1
    prompt = build_clarification_prompt(brief, history, round_num)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()

    if "LISTO_PARA_PLANEAR" in text:
        return "", True

    return text, False


def conduct_interview(brief: str) -> list[dict]:
    """
    Runs up to 3 rounds of clarification with the PO.
    Returns the clarification history.
    """
    history = []
    max_rounds = 3

    print("\n--- ENTREVISTA DE CLARIFICACION ---\n")

    for round_num in range(max_rounds):
        questions, ready = run_clarification(brief, history)

        if ready:
            print("Tengo suficiente informacion para continuar.\n")
            break

        print(f"Ronda {round_num + 1}:\n{questions}\n")
        answer = input("Tu respuesta: ").strip()

        if not answer:
            print("Continuando con la informacion disponible.\n")
            break

        history.append({"questions": questions, "answer": answer})

    return history
