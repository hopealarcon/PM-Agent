from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Priority(str, Enum):
    MUST = "must-have"
    SHOULD = "should-have"
    COULD = "could-have"
    WONT = "wont-have"


class Decision(str, Enum):
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    DEFERRED = "deferred"


class Confidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(BaseModel):
    title: str
    estimated_hours: Optional[float] = None
    role: Optional[str] = None


class Feature(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.SHOULD
    tasks: list[Task] = Field(default_factory=list)


class Epic(BaseModel):
    title: str
    priority: Priority = Priority.SHOULD
    estimated_effort: Optional[str] = None
    features: list[Feature] = Field(default_factory=list)


class Risk(BaseModel):
    title: str
    probability: Confidence = Confidence.MEDIUM
    impact: Confidence = Confidence.MEDIUM
    mitigation: Optional[str] = None


class Milestone(BaseModel):
    name: str
    target_date: Optional[str] = None
    gate_criteria: list[str] = Field(default_factory=list)


class ScopeDecision(BaseModel):
    feature: str
    decision: Decision
    reason: Optional[str] = None


class Plan(BaseModel):
    confidence_level: Confidence = Confidence.MEDIUM
    epics: list[Epic] = Field(default_factory=list)
    risks: list[Risk] = Field(default_factory=list)
    milestones: list[Milestone] = Field(default_factory=list)


class Session(BaseModel):
    project_name: str
    brief_raw: str
    assumptions: list[str] = Field(default_factory=list)
    clarification_history: list[dict] = Field(default_factory=list)
    scope_decisions: list[ScopeDecision] = Field(default_factory=list)
    plan: Optional[Plan] = None
