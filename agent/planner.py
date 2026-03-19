import os
import json
import anthropic
from dotenv import load_dotenv
from prompts.plan_generation import SYSTEM_PROMPT, build_plan_prompt
from schemas.plan import Plan

load_dotenv()

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


def generate_plan(brief: str, clarifications: list[dict], accepted_scope: dict) -> Plan:
    print("\nGenerando plan de proyecto...\n")

    prompt = build_plan_prompt(brief, clarifications, accepted_scope)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()

    # Strip markdown code blocks if present
    if text.startswith("```"):
        text = re.sub(r'^```[a-z]*\n?', '', text)
        text = re.sub(r'\n?```$', '', text)

    data = json.loads(text)
    return Plan(**data)


import re
