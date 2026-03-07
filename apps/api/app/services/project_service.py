from __future__ import annotations

import re

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.workspace import User, Workspace, WorkspaceMember
from app.security.auth0 import CurrentUser


class ProjectService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def slugify(name: str) -> str:
        value = re.sub(r"[^a-zA-Z0-9]+", "-", name.strip().lower()).strip("-")
        return value or "project"

    def next_available_project_slug(self, workspace_id, name: str) -> str:
        base = self.slugify(name)
        slug = base
        suffix = 2
        while self.db.query(Project).filter(Project.workspace_id == workspace_id, Project.slug == slug).first() is not None:
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    def get_or_create_local_user(self, current_user: CurrentUser) -> User:
        user = self.db.query(User).filter(User.auth0_user_id == current_user.sub).first()
        if user:
            return user

        user = User(
            auth0_user_id=current_user.sub,
            email=current_user.email or "dev@growthlaunchpad.app",
            name=current_user.name,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def get_or_create_default_workspace(self, user: User) -> Workspace:
        workspace = (
            self.db.query(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .filter(WorkspaceMember.user_id == user.id)
            .first()
        )
        if workspace:
            return workspace

        slug_seed = self.slugify(f"{(user.name or 'user')} workspace")
        slug = slug_seed
        suffix = 2
        while self.db.query(Workspace).filter(Workspace.slug == slug).first() is not None:
            slug = f"{slug_seed}-{suffix}"
            suffix += 1

        workspace = Workspace(
            auth0_org_id=None,
            name=f"{user.name or 'User'} Workspace",
            slug=slug,
            owner_user_id=user.id,
        )
        self.db.add(workspace)
        self.db.flush()

        membership = WorkspaceMember(
            workspace_id=workspace.id,
            user_id=user.id,
            role="owner",
            status="active",
        )
        self.db.add(membership)
        self.db.flush()
        return workspace

    def get_project_or_404(self, project_id):
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return project
