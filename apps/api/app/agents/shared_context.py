from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.execution import Contact
from app.models.positioning import PositioningVersion
from app.models.project import Project, ProjectBrief, ProjectMemory, ProjectSource
from app.models.research import Competitor, OpportunityWedge, PainPointCluster


def build_project_context(db: Session, project_id) -> dict:
    project = db.query(Project).filter(Project.id == project_id).first()
    brief = db.query(ProjectBrief).filter(ProjectBrief.project_id == project_id).order_by(ProjectBrief.created_at.desc()).first()
    sources = db.query(ProjectSource).filter(ProjectSource.project_id == project_id).all()
    memory = db.query(ProjectMemory).filter(ProjectMemory.project_id == project_id).all()
    competitors = db.query(Competitor).filter(Competitor.project_id == project_id).all()
    pains = db.query(PainPointCluster).filter(PainPointCluster.project_id == project_id).all()
    wedges = db.query(OpportunityWedge).filter(OpportunityWedge.project_id == project_id).all()
    positioning = (
        db.query(PositioningVersion)
        .filter(PositioningVersion.project_id == project_id)
        .order_by(PositioningVersion.created_at.desc())
        .all()
    )
    contacts = db.query(Contact).filter(Contact.project_id == project_id).all()
    github_snapshot = next((m.memory_value for m in memory if m.memory_key == "github_repos_snapshot"), None)

    return {
        "project": {
            "id": str(project.id) if project else None,
            "name": project.name if project else None,
            "summary": project.summary if project else None,
            "goal": project.goal if project else None,
            "stage": project.stage if project else None,
        },
        "brief": {
            "raw": brief.raw_brief if brief else None,
            "problem": brief.parsed_problem if brief else None,
            "audience": brief.parsed_audience if brief else None,
        },
        "sources": [{"type": s.source_type, "url": s.url, "title": s.title} for s in sources],
        "memory": [{"key": m.memory_key, "value": m.memory_value, "type": m.memory_type} for m in memory],
        "research": {
            "competitors": [{"name": c.name, "positioning": c.positioning, "pricing": c.pricing_summary} for c in competitors],
            "pain_points": [{"label": p.label, "description": p.description, "rank": p.rank} for p in pains],
            "wedges": [{"label": w.label, "description": w.description, "score": float(w.score or 0)} for w in wedges],
        },
        "positioning_versions": [
            {
                "id": str(v.id),
                "icp": v.icp,
                "wedge": v.wedge,
                "statement": v.positioning_statement,
                "selected": v.selected,
            }
            for v in positioning
        ],
        "contacts": [{"id": str(c.id), "email": c.email, "name": c.name, "segment": c.segment} for c in contacts],
        "github": github_snapshot or {"repos": [], "count": 0},
    }
