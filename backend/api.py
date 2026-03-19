import os
import json
import re
import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

from db import repositories
from schemas.plan import Session, ScopeDecision, Decision, Plan
from prompts.clarification import SYSTEM_PROMPT as CLARIFY_SYSTEM, build_clarification_prompt
from prompts.scope_review import SYSTEM_PROMPT as SCOPE_SYSTEM, build_epics_prompt, build_features_prompt
from prompts.plan_generation import SYSTEM_PROMPT as PLAN_SYSTEM, build_plan_prompt

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

claude = anthropic.Anthropic(api_key="".join(os.environ["ANTHROPIC_API_KEY"].split()))


# --- Request/Response models ---

class StartProjectRequest(BaseModel):
    name: str
    brief: str

class ClarifyRequest(BaseModel):
    brief: str
    history: list[dict]

class ProposeEpicsRequest(BaseModel):
    brief: str
    clarifications: list[dict]

class ProposeFeaturesRequest(BaseModel):
    epic_title: str
    brief: str
    clarifications: list[dict]

class GeneratePlanRequest(BaseModel):
    name: str
    brief: str
    clarifications: list[dict]
    accepted_scope: dict
    scope_decisions: list[dict]


# --- Endpoints ---

@app.get("/api/projects")
def list_projects():
    return repositories.get_projects()


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    plan = repositories.get_plan(project_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    return plan


@app.post("/api/clarify")
def clarify(req: ClarifyRequest):
    round_num = len(req.history) + 1
    prompt = build_clarification_prompt(req.brief, req.history, round_num)

    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=CLARIFY_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.content[0].text.strip()

    if "LISTO_PARA_PLANEAR" in text:
        return {"ready": True, "questions": None}

    return {"ready": False, "questions": text}


@app.post("/api/scope/epics")
def propose_epics(req: ProposeEpicsRequest):
    prompt = build_epics_prompt(req.brief, req.clarifications)
    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SCOPE_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.content[0].text.strip()

    epics = []
    for line in text.split("\n"):
        clean = re.sub(r'\*+', '', line.strip())  # remove markdown bold
        match = re.match(r'\[([A-Z])\]\s+(.+?)(?:\s+-\s+(.+))?$', clean)
        if match:
            epics.append({
                "key": match.group(1),
                "title": match.group(2).strip(),
                "description": match.group(3).strip() if match.group(3) else ""
            })

    return {"epics": epics}


@app.post("/api/scope/features")
def propose_features(req: ProposeFeaturesRequest):
    prompt = build_features_prompt(req.epic_title, req.brief, req.clarifications)
    response = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SCOPE_SYSTEM,
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.content[0].text.strip()

    features = []
    for line in text.split("\n"):
        clean = re.sub(r'\*+', '', line.strip())
        match = re.match(r'\[(\d+)\]\s+(.+?)(?:\s+-\s+(.+?))?(?:\s+\((must-have|should-have|could-have)\))?$', clean)
        if match:
            features.append({
                "title": match.group(2).strip(),
                "description": match.group(3).strip() if match.group(3) else "",
                "priority": match.group(4) or "should-have"
            })

    return {"features": features}


@app.post("/api/projects")
def generate_and_save(req: GeneratePlanRequest):
    try:
        prompt = build_plan_prompt(req.brief, req.clarifications, req.accepted_scope)
        response = claude.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=16000,
            system=PLAN_SYSTEM,
            messages=[{"role": "user", "content": prompt}]
        )
        text = response.content[0].text.strip()
        text = re.sub(r'^```[a-z]*\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude error: {e}")

    try:
        plan = Plan(**json.loads(text))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error: {e} | raw: {text[:300]}")

    try:
        session = Session(
            project_name=req.name,
            brief_raw=req.brief,
            clarification_history=req.clarifications,
            scope_decisions=[ScopeDecision(**d) for d in req.scope_decisions],
            plan=plan
        )
        project_id = repositories.save_project(req.name)
        repositories.save_session(project_id, session)
        repositories.save_scope_decisions(project_id, session.scope_decisions)
        repositories.save_plan(project_id, plan)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return {"project_id": project_id}


@app.get("/health")
def health():
    return {"status": "ok"}
