from agent.state_machine import run
from db import repositories


def new_project():
    print("\n=== PM AGENT ===\n")
    project_name = input("Nombre del proyecto: ").strip()
    if not project_name:
        print("Nombre requerido.")
        return

    print("\nDescribe el proyecto (puedes ser tan breve o detallado como quieras):")
    brief = input("> ").strip()
    if not brief:
        print("Descripcion requerida.")
        return

    run(project_name, brief)


def list_projects():
    projects = repositories.get_projects()
    if not projects:
        print("\nNo hay proyectos guardados.\n")
        return

    print("\n--- PROYECTOS ---\n")
    for p in projects:
        print(f"  {p['id']} | {p['name']} | {p['status']} | {p['created_at'][:10]}")
    print()


def view_plan():
    project_id = input("\nProject ID: ").strip()
    plan = repositories.get_plan(project_id)
    if not plan:
        print("Plan no encontrado.")
        return

    print(f"\nPlan v{plan['version']} | Confianza: {plan['confidence_level']}\n")
    for epic in plan.get("epics", []):
        print(f"[{epic['priority']}] {epic['title']}")
        for feat in epic.get("features", []):
            total = sum(t.get("estimated_hours") or 0 for t in feat.get("tasks", []))
            print(f"  • {feat['title']} ({feat['priority']})" + (f" — {total}h" if total else ""))


def main():
    print("\n=== PM AGENT ===")
    print("1. Nuevo proyecto")
    print("2. Ver proyectos")
    print("3. Ver plan de proyecto")
    print("4. Salir")

    choice = input("\nOpcion: ").strip()

    if choice == "1":
        new_project()
    elif choice == "2":
        list_projects()
    elif choice == "3":
        view_plan()
    elif choice == "4":
        return
    else:
        print("Opcion invalida.")


if __name__ == "__main__":
    main()
