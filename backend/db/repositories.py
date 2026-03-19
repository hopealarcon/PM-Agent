import json
from db.client import get_client
from schemas.plan import Session, Plan, ScopeDecision


def save_project(name: str) -> str:
    client = get_client()
    row = client.insert("projects", {"name": name, "status": "active"})
    return row["id"]


def save_session(project_id: str, session: Session) -> str:
    client = get_client()
    row = client.insert("sessions", {
        "project_id": project_id,
        "brief_raw": session.brief_raw,
        "assumptions": session.assumptions,
        "clarification_history": session.clarification_history,
    })
    return row["id"]


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
    client.insert_many("scope_decisions", rows)


def save_plan(project_id: str, plan: Plan, version: int = 1) -> str:
    client = get_client()

    plan_row = client.insert("plans", {
        "project_id": project_id,
        "version": version,
        "confidence_level": plan.confidence_level.value,
    })
    plan_id = plan_row["id"]

    for epic in plan.epics:
        epic_row = client.insert("epics", {
            "plan_id": plan_id,
            "title": epic.title,
            "priority": epic.priority.value,
            "estimated_effort": epic.estimated_effort,
        })
        epic_id = epic_row["id"]

        for feature in epic.features:
            feat_row = client.insert("features", {
                "epic_id": epic_id,
                "title": feature.title,
                "description": feature.description,
                "priority": feature.priority.value,
            })
            feat_id = feat_row["id"]

            for task in feature.tasks:
                client.insert("tasks", {
                    "feature_id": feat_id,
                    "title": task.title,
                    "estimated_hours": task.estimated_hours,
                    "role": task.role,
                })

    for risk in plan.risks:
        client.insert("risks", {
            "plan_id": plan_id,
            "title": risk.title,
            "probability": risk.probability.value,
            "impact": risk.impact.value,
            "mitigation": risk.mitigation,
        })

    for milestone in plan.milestones:
        client.insert("milestones", {
            "plan_id": plan_id,
            "name": milestone.name,
            "target_date": milestone.target_date,
            "gate_criteria": milestone.gate_criteria,
        })

    return plan_id


def save_timeline(project_id: str, resources: list[dict], start_date: str, entries: list[dict]) -> str:
    client = get_client()
    row = client.insert("timelines", {
        "project_id": project_id,
        "resources": json.dumps(resources),
        "start_date": start_date,
        "entries": json.dumps(entries),
    })
    return row["id"]


def get_timeline(project_id: str) -> dict | None:
    client = get_client()
    rows = client.select("timelines", filters={"project_id": f"eq.{project_id}"}, order="created_at.desc", limit=1)
    if not rows:
        return None
    row = rows[0]
    if isinstance(row.get("resources"), str):
        row["resources"] = json.loads(row["resources"])
    if isinstance(row.get("entries"), str):
        row["entries"] = json.loads(row["entries"])
    return row


def get_projects() -> list[dict]:
    client = get_client()
    return client.select("projects", "id,name,status,created_at", order="created_at.desc")


def save_release_plan(name: str, releases: list, resources: list, start_date: str, entries: list, go_live_dates: dict) -> str:
    client = get_client()
    row = client.insert("release_plans", {
        "name": name,
        "releases": json.dumps(releases),
        "resources": json.dumps(resources),
        "start_date": start_date,
        "schedule_entries": json.dumps(entries),
        "go_live_dates": json.dumps(go_live_dates),
    })
    return row["id"]


def get_release_plan(plan_id: str) -> dict | None:
    client = get_client()
    rows = client.select("release_plans", filters={"id": f"eq.{plan_id}"}, limit=1)
    if not rows:
        return None
    row = rows[0]
    for field in ["releases", "resources", "schedule_entries", "go_live_dates"]:
        if isinstance(row.get(field), str):
            row[field] = json.loads(row[field])
    return row


def get_release_plans() -> list[dict]:
    client = get_client()
    return client.select("release_plans", "id,name,created_at", order="created_at.desc")


def get_plan(project_id: str) -> dict | None:
    client = get_client()

    plans = client.select("plans", filters={"project_id": f"eq.{project_id}"},
                          order="version.desc", limit=1)
    if not plans:
        return None
    plan = plans[0]
    plan_id = plan["id"]

    epics = client.select("epics", filters={"plan_id": f"eq.{plan_id}"})
    for epic in epics:
        features = client.select("features", filters={"epic_id": f"eq.{epic['id']}"})
        for feat in features:
            feat["tasks"] = client.select("tasks", filters={"feature_id": f"eq.{feat['id']}"})
        epic["features"] = features

    plan["epics"] = epics
    plan["risks"] = client.select("risks", filters={"plan_id": f"eq.{plan_id}"})
    plan["milestones"] = client.select("milestones", filters={"plan_id": f"eq.{plan_id}"})

    return plan
