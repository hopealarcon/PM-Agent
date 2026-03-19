# PM Agent — Contexto del Proyecto

## Que es esto
Un agente de IA que reemplaza a un project manager. La primera fase es generar project plans a partir de un brief del Product Owner.

## Como funciona (flujo)

```
Brief del PO
    → INTAKE: clasifica el proyecto, detecta ambiguedades
    → ENTREVISTA DE CLARIFICACION: max 3 preguntas por ronda, hasta 3 rondas
    → REVISION DE SCOPE: el PO acepta/rechaza/modifica features propuestas por el agente
    → GENERACION DEL PLAN: epics > features > tasks, con estimados y riesgos
    → GUARDADO EN BASE DE DATOS
```

## Modelo de trabajo
Hibrido: el PO da la vision y constraints, el agente propone el scope completo (incluyendo features implicitas), el PO valida antes de generar el plan detallado.

## Stack
- **Agente / Backend:** Python + FastAPI
- **Claude SDK:** `anthropic` (Python) — modelo claude-sonnet-4-6
- **Base de datos:** Supabase (PostgreSQL)
- **Interfaz inicial:** CLI

## Estructura del proyecto
```
PM Agent/
  ├── main.py
  ├── agent/
  │   ├── state_machine.py     # fases: intake → clarification → review → plan
  │   ├── interviewer.py       # genera preguntas de clarificacion
  │   ├── scope_reviewer.py    # flujo de revision de scope
  │   └── planner.py           # genera el plan detallado
  ├── prompts/
  │   ├── clarification.py
  │   ├── scope_review.py
  │   └── plan_generation.py
  ├── db/
  │   ├── client.py            # conexion a Supabase
  │   └── repositories.py      # guardar/consultar planes
  ├── schemas/
  │   └── plan.py              # modelos Pydantic
  └── .env                     # ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY
```

## Schema de base de datos (Supabase / PostgreSQL)

```sql
projects          -- un proyecto por sesion
  id, name, created_at, status

sessions          -- la conversacion completa
  id, project_id, brief_raw, assumptions, created_at

scope_decisions   -- lo aceptado/rechazado en la revision de scope
  id, project_id, feature, decision (accepted/rejected/deferred), reason

plans             -- el plan generado (versionado)
  id, project_id, version, generated_at, confidence_level

epics
  id, plan_id, title, priority, estimated_effort

features
  id, epic_id, title, priority, description

tasks
  id, feature_id, title, estimated_hours, role

risks
  id, plan_id, title, probability, impact, mitigation

milestones
  id, plan_id, name, target_date, gate_criteria
```

## Fase de revision de scope

El agente presenta el scope en 2 capas:
1. **Epics** — el PO acepta/rechaza/agrega areas de trabajo
2. **Features por epic** — el PO valida el detalle

Maximo 3 rondas. Las features rechazadas se guardan como out-of-scope explicito.

El agente genera un **Scope Document** que el PO confirma antes de proceder al plan detallado.

## Estado actual
- [x] Arquitectura disenada
- [x] Flujo de revision de scope disenado
- [x] Schema de base de datos disenado
- [x] Sandbox de Claude Code configurado → `/Users/raquelalarcon/Cracken/PM Agent`
- [ ] Crear tablas en Supabase
- [ ] Implementar schemas Pydantic
- [ ] Implementar state machine
- [ ] Implementar interviewer
- [ ] Implementar scope reviewer
- [ ] Implementar planner
- [ ] Implementar db client y repositories
- [ ] CLI (main.py)

## Proximos pasos
1. Dar credenciales de Supabase (SUPABASE_URL y SUPABASE_KEY)
2. Crear las tablas en Supabase
3. Crear archivo .env con las credenciales
4. Empezar implementacion por schemas/plan.py
