"""FastAPI dependencies for trusted identity and authorization."""

from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status

from app.security.authorization import Permission, Role, has_permission


@dataclass(frozen=True)
class Principal:
    """A user identity established by a trusted authentication layer."""

    user_id: str
    role: Role


def get_current_principal(request: Request) -> Principal:
    """Read the principal set by verified server-side authentication."""
    principal = getattr(request.state, "principal", None)

    if not isinstance(principal, Principal):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return principal


def require_authorization(permission: Permission):
    """Create a dependency that enforces a specific permission."""

    def permission_dependency(
        principal: Principal = Depends(get_current_principal),
    ) -> Principal:
        if not has_permission(principal.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return principal

    return permission_dependency
