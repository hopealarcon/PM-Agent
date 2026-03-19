from schemas.plan import Session
from agent.interviewer import conduct_interview
from agent.scope_reviewer import run_scope_review
from agent.planner import generate_plan
from db import repositories


def run(project_name: str, brief: str):
    session = Session(project_name=project_name, brief_raw=brief)

    # Phase 1: Clarification interview
    session.clarification_history = conduct_interview(brief)

    # Phase 2: Scope review
    accepted_scope, scope_decisions = run_scope_review(brief, session.clarification_history)
    session.scope_decisions = scope_decisions

    # Phase 3: Plan generation
    plan = generate_plan(brief, session.clarification_history, accepted_scope)
    session.plan = plan

    # Phase 4: Save to database
    print("\nGuardando en base de datos...")
    project_id = repositories.save_project(project_name)
    repositories.save_session(project_id, session)
    repositories.save_scope_decisions(project_id, scope_decisions)
    plan_id = repositories.save_plan(project_id, plan)

    print(f"\nPlan guardado. Project ID: {project_id}\n")

    # Print summary
    _print_summary(plan, scope_decisions)

    return project_id


def _print_summary(plan, scope_decisions):
    from schemas.plan import Decision

    print("=" * 60)
    print("PLAN DE PROYECTO")
    print("=" * 60)

    for epic in plan.epics:
        print(f"\n[{epic.priority.value.upper()}] {epic.title}" + (f" ({epic.estimated_effort})" if epic.estimated_effort else ""))
        for feat in epic.features:
            total_hours = sum(t.estimated_hours or 0 for t in feat.tasks)
            print(f"  • {feat.title} ({feat.priority.value})" + (f" — {total_hours}h" if total_hours else ""))

    if plan.milestones:
        print("\nMILESTONES:")
        for m in plan.milestones:
            print(f"  • {m.name}" + (f" — {m.target_date}" if m.target_date else ""))

    if plan.risks:
        print("\nRIESGOS:")
        for r in plan.risks:
            print(f"  • [{r.probability.value}/{r.impact.value}] {r.title}")

    rejected = [d for d in scope_decisions if d.decision == Decision.REJECTED]
    if rejected:
        print("\nOUT OF SCOPE:")
        for d in rejected:
            print(f"  • {d.feature}")

    print("=" * 60)
