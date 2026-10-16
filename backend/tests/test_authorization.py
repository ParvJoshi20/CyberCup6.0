import pytest
from fastapi import HTTPException

from app.security.authorization import (
    Permission,
    Role,
    has_permission,
    require_permission,
)


@pytest.mark.parametrize(
    ("role", "permission", "expected"),
    [
        (Role.USER, Permission.CHAT_USE, True),
        (Role.USER, Permission.REVIEW_READ, False),
        (Role.USER, Permission.REVIEW_DECIDE, False),
        (Role.USER, Permission.AUTHZ_MANAGE, False),
        (Role.REVIEWER, Permission.CHAT_USE, True),
        (Role.REVIEWER, Permission.REVIEW_READ, True),
        (Role.REVIEWER, Permission.REVIEW_DECIDE, True),
        (Role.REVIEWER, Permission.AUTHZ_MANAGE, False),
        (Role.ADMIN, Permission.CHAT_USE, True),
        (Role.ADMIN, Permission.REVIEW_READ, True),
        (Role.ADMIN, Permission.REVIEW_DECIDE, True),
        (Role.ADMIN, Permission.AUTHZ_MANAGE, True),
    ],
)
def test_role_permission_matrix(role, permission, expected):
    assert has_permission(role, permission) is expected


@pytest.mark.parametrize(
    ("role", "permission"),
    [
        ("superuser", Permission.CHAT_USE),
        (Role.USER, "unknown:permission"),
        ("", Permission.CHAT_USE),
    ],
)
def test_unknown_roles_or_permissions_are_denied(role, permission):
    assert has_permission(role, permission) is False


def test_require_permission_allows_authorized_action():
    require_permission(Role.REVIEWER, Permission.REVIEW_DECIDE)


def test_require_permission_rejects_unauthorized_action():
    with pytest.raises(HTTPException) as exc_info:
        require_permission(Role.USER, Permission.REVIEW_DECIDE)

    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == (
        "You do not have permission to perform this action."
    )


def test_admin_has_every_defined_permission():
    for permission in Permission:
        assert has_permission(Role.ADMIN, permission)
