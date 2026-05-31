"""Custom DRF permission classes."""

from rest_framework.permissions import BasePermission, IsAuthenticated


class IsAdmin(BasePermission):
    """Allow access only to users with role='admin'."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == "admin"
        )


class IsInstructor(BasePermission):
    """Allow access to instructors and admins."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ("instructor", "admin")
        )


class IsOwnerOrAdmin(BasePermission):
    """Object-level permission: owner or admin can access."""

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
            return True
        # The object must have a 'user' attribute pointing to the owner
        return getattr(obj, "user", None) == request.user


class IsProUser(BasePermission):
    """Allow access only to Pro/Enterprise plan users."""

    message = "Upgrade to Pro to access this feature."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.plan in ("pro", "enterprise")
        )
