import os
import re
import anthropic
from dotenv import load_dotenv
from prompts.scope_review import SYSTEM_PROMPT, build_epics_prompt, build_features_prompt
from schemas.plan import ScopeDecision, Decision

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def _propose_epics(brief: str, clarifications: list[dict]) -> list[dict]:
    prompt = build_epics_prompt(brief, clarifications)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.content[0].text.strip()

    epics = []
    for line in text.split("\n"):
        match = re.match(r'\[([A-Z])\]\s+(.+?)(?:\s+-\s+(.+))?$', line.strip())
        if match:
            epics.append({
                "key": match.group(1),
                "title": match.group(2).strip(),
                "description": match.group(3).strip() if match.group(3) else ""
            })
    return epics


def _propose_features(epic_title: str, brief: str, clarifications: list[dict]) -> list[dict]:
    prompt = build_features_prompt(epic_title, brief, clarifications)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.content[0].text.strip()

    features = []
    for line in text.split("\n"):
        match = re.match(r'\[(\d+)\]\s+(.+?)(?:\s+-\s+(.+?))?(?:\s+\((must-have|should-have|could-have)\))?$', line.strip())
        if match:
            features.append({
                "title": match.group(2).strip(),
                "description": match.group(3).strip() if match.group(3) else "",
                "priority": match.group(4) or "should-have"
            })
    return features


def _parse_user_changes(response: str, items: list[dict]) -> tuple[list[dict], list[ScopeDecision]]:
    """Parse free-text PO response to accept/reject/add items."""
    response_lower = response.lower().strip()
    decisions = []
    accepted = list(items)

    # If user approves everything
    if any(word in response_lower for word in ["todo", "todo bien", "ok", "si", "sí", "continua", "listo"]):
        for item in items:
            decisions.append(ScopeDecision(feature=item["title"], decision=Decision.ACCEPTED))
        return accepted, decisions

    # Parse removals
    remove_patterns = [r'quita\s+(.+)', r'elimina\s+(.+)', r'saca\s+(.+)', r'sin\s+(.+)', r'no\s+(.+)']
    to_remove = []
    for pattern in remove_patterns:
        matches = re.findall(pattern, response_lower)
        to_remove.extend(matches)

    # Match removals to items
    final_items = []
    for item in items:
        removed = False
        for removal in to_remove:
            if any(word in item["title"].lower() for word in removal.split() if len(word) > 3):
                decisions.append(ScopeDecision(
                    feature=item["title"],
                    decision=Decision.REJECTED,
                    reason="Descartado por PO"
                ))
                removed = True
                break
        if not removed:
            final_items.append(item)
            decisions.append(ScopeDecision(feature=item["title"], decision=Decision.ACCEPTED))

    # Parse additions
    add_patterns = [r'agrega\s+(.+)', r'añade\s+(.+)', r'incluye\s+(.+)']
    for pattern in add_patterns:
        matches = re.findall(pattern, response_lower)
        for match in matches:
            new_item = {"title": match.strip().capitalize(), "description": "", "priority": "should-have"}
            final_items.append(new_item)
            decisions.append(ScopeDecision(feature=new_item["title"], decision=Decision.ACCEPTED))

    return final_items, decisions


def run_scope_review(brief: str, clarifications: list[dict]) -> tuple[dict, list[ScopeDecision]]:
    """
    Runs the 2-layer scope review with the PO.
    Returns (accepted_scope, all_decisions)
    """
    all_decisions = []

    # --- Layer 1: Epics ---
    print("\n--- REVISION DE SCOPE ---\n")
    print("Analizando el proyecto...\n")

    proposed_epics = _propose_epics(brief, clarifications)

    print("Propongo las siguientes areas de trabajo:\n")
    for epic in proposed_epics:
        print(f"  [{epic['key']}] {epic['title']}" + (f" — {epic['description']}" if epic['description'] else ""))

    print("\n¿Hay algo que eliminar, agregar o renombrar? (o escribe 'todo' para aprobar)")
    epic_response = input("\nTu respuesta: ").strip()

    accepted_epics, epic_decisions = _parse_user_changes(epic_response, proposed_epics)
    all_decisions.extend(epic_decisions)

    # --- Layer 2: Features per epic ---
    accepted_scope = {}

    for epic in accepted_epics:
        print(f"\nDentro de [{epic['title']}], propongo:\n")
        proposed_features = _propose_features(epic["title"], brief, clarifications)

        for i, feat in enumerate(proposed_features, 1):
            print(f"  [{i}] {feat['title']}" + (f" — {feat['description']}" if feat['description'] else "") + f" ({feat['priority']})")

        print("\n¿Algo que ajustar? (o escribe 'todo' para aprobar)")
        feat_response = input("Tu respuesta: ").strip()

        accepted_features, feat_decisions = _parse_user_changes(feat_response, proposed_features)
        all_decisions.extend(feat_decisions)

        accepted_scope[epic["title"]] = accepted_features

    return accepted_scope, all_decisions
