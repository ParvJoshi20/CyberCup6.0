
"""Role-based authorization primitives for AegisGate.

This module evaluates permissions only. It does not authenticate users.
Roles must come from a trusted server-side identity source.
"""

from __future__ import annotations

from enum import Enum

from fastapi import HTTPException, status


class Role(str, Enum):
    USER = "user"
    REVIEWER = "reviewer"
    ADMIN = "admin"


class Permission(str, Enum):
    CHAT_USE = "chat:use"
    REVIEW_READ = "review:read"
    REVIEW_DECIDE = "review:decide"
    AUTHZ_MANAGE = "authorization:manage"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.USER: frozenset({
        Permission.CHAT_USE,
    }),
    Role.REVIEWER: frozenset({
        Permission.CHAT_USE,
        Permission.REVIEW_READ,
        Permission.REVIEW_DECIDE,
    }),
    Role.ADMIN: frozenset(Permission),
}


def has_permission(
    role: Role | str,
    permission: Permission | str,
) -> bool:
    """Return False for unknown roles or permissions: default deny."""
    try:
        trusted_role = Role(role)
        required_permission = Permission(permission)
    except (ValueError, TypeError):
        return False

    return required_permission in ROLE_PERMISSIONS.get(
        trusted_role, frozenset()
    )


def require_permission(
    role: Role | str,
    permission: Permission | str,
) -> None:
    """Raise HTTP 403 when the role lacks the requested permission."""
    if not has_permission(role, permission):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
