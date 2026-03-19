import time
from db.client import get_client
from schemas.plan import Session, Plan, ScopeDecision


def _with_retry(fn, retries=2):
    for attempt in range(retries):
        try:
            return fn()
        except Exception as e:
            if attempt < retries - 1 and "RemoteProtocolError" in str(type(e).__name__) or "StreamReset" in str(e):
                time.sleep(0.5)
                continue
            raise


def save_project(name: str) -> str:
    def fn():
        client = get_client()
        res = client.table("projects").insert({"name": name, "status": "active"}).execute()
        return res.data[0]["id"]
    return _with_retry(fn)


def save_session(project_id: str, session: Session) -> str:
    client = get_client()
    res = client.table("sessions").insert({
        "project_id": project_id,
        "brief_raw": session.brief_raw,
        "assumptions": session.assumptions,
        "clarification_history": session.clarification_history,
    }).execute()
    return res.data[0]["id"]


def save_scope_decisions(project_id: str, decisions: list[ScopeDecision]):
    client = get_client()
    rows = [
        {
            "project_id": project_id,
            "feature": d.feature,
            "decision": d.decision.value,
            "reason": d.reason,
        }
        for d in decisions
    ]
    client.table("scope_decisions").insert(rows).execute()


def save_plan(project_id: str, plan: Plan, version: int = 1) -> str:
    client = get_client()

    plan_res = client.table("plans").insert({
        "project_id": project_id,
        "version": version,
        "confidence_level": plan.confidence_level.value,
    }).execute()
    plan_id = plan_res.data[0]["id"]

    for epic in plan.epics:
        epic_res = client.table("epics").insert({
            "plan_id": plan_id,
            "title": epic.title,
            "priority": epic.priority.value,
            "estimated_effort": epic.estimated_effort,
        }).execute()
        epic_id = epic_res.data[0]["id"]

        for feature in epic.features:
            feat_res = client.table("features").insert({
                "epic_id": epic_id,
                "title": feature.title,
                "description": feature.description,
                "priority": feature.priority.value,
            }).execute()
            feat_id = feat_res.data[0]["id"]

            for task in feature.tasks:
                client.table("tasks").insert({
                    "feature_id": feat_id,
                    "title": task.title,
                    "estimated_hours": task.estimated_hours,
                    "role": task.role,
                }).execute()

    for risk in plan.risks:
        client.table("risks").insert({
            "plan_id": plan_id,
            "title": risk.title,
            "probability": risk.probability.value,
            "impact": risk.impact.value,
            "mitigation": risk.mitigation,
        }).execute()

    for milestone in plan.milestones:
        client.table("milestones").insert({
            "plan_id": plan_id,
            "name": milestone.name,
            "target_date": milestone.target_date,
            "gate_criteria": milestone.gate_criteria,
        }).execute()

    return plan_id


def get_projects() -> list[dict]:
    def fn():
        client = get_client()
        res = client.table("projects").select("id, name, status, created_at").order("created_at", desc=True).execute()
        return res.data
    return _with_retry(fn)


def get_plan(project_id: str) -> dict | None:
    client = get_client()

    plan_res = client.table("plans").select("*").eq("project_id", project_id).order("version", desc=True).limit(1).execute()
    if not plan_res.data:
        return None
    plan = plan_res.data[0]
    plan_id = plan["id"]

    epics_res = client.table("epics").select("*").eq("plan_id", plan_id).execute()
    epics = []
    for epic in epics_res.data:
        features_res = client.table("features").select("*").eq("epic_id", epic["id"]).execute()
        features = []
        for feat in features_res.data:
            tasks_res = client.table("tasks").select("*").eq("feature_id", feat["id"]).execute()
            feat["tasks"] = tasks_res.data
            features.append(feat)
        epic["features"] = features
        epics.append(epic)

    plan["epics"] = epics
    plan["risks"] = client.table("risks").select("*").eq("plan_id", plan_id).execute().data
    plan["milestones"] = client.table("milestones").select("*").eq("plan_id", plan_id).execute().data

    return plan
