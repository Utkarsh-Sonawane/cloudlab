"""Users app — Auth & Profile Views."""

import logging

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from social_core.exceptions import AuthException, MissingBackend

from cloudlab.core.utils.response import created_response, error_response, success_response

from .models import UserProfile
from .serializers import (
    CloudLabTokenObtainSerializer,
    LeaderboardEntrySerializer,
    PublicUserSerializer,
    RegisterSerializer,
    SocialAuthSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)

User = get_user_model()
logger = logging.getLogger("cloudlab.users.views")


class SocialLoginView(APIView):
    """
    POST /api/v1/auth/social-login/<backend>/
    Accepts a Google access_token and returns CloudLab JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request, backend, *args, **kwargs):
        serializer = SocialAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data.get("access_token")
        code = serializer.validated_data.get("code")
        redirect_uri = serializer.validated_data.get("redirect_uri")

        try:
            from social_core.backends.oauth import BaseOAuth2
            from social_django.utils import load_backend, load_strategy

            # Load the social-auth strategy and backend manually
            strategy = load_strategy(request)
            try:
                auth_backend = load_backend(strategy, backend, redirect_uri=redirect_uri)
            except MissingBackend:
                return error_response(f"Invalid social backend: '{backend}'", status_code=status.HTTP_400_BAD_REQUEST)

            # If we have a code (GitHub flow), exchange it for an access token
            if code and not access_token:
                try:
                    # Use Django settings directly to avoid any social-core lookup issues
                    from django.conf import settings as django_settings
                    client_id = django_settings.SOCIAL_AUTH_GITHUB_KEY
                    client_secret = django_settings.SOCIAL_AUTH_GITHUB_SECRET

                    payload = {
                        'client_id': client_id,
                        'client_secret': client_secret,
                        'code': code,
                    }
                    # Only add redirect_uri if explicitly provided
                    if redirect_uri:
                        payload['redirect_uri'] = redirect_uri

                    print(f"DEBUG: Exchanging code. client_id={client_id}, code={code[:10]}..., redirect_uri={redirect_uri}")
                    resp = requests.post(
                        'https://github.com/login/oauth/access_token',
                        data=payload,
                        headers={'Accept': 'application/json'},
                        timeout=10
                    )
                    print(f"DEBUG: GitHub response status={resp.status_code}, body={resp.text}")

                    token_data = resp.json()
                    if 'error' in token_data:
                        return error_response(f"GitHub token exchange failed: {token_data}")

                    access_token = token_data.get('access_token')
                    print(f"DEBUG: access_token obtained: {str(access_token)[:10]}...")
                except Exception as e:
                    print(f"DEBUG: Code exchange exception: {str(e)}")
                    logger.warning("Failed to exchange code for token: %s", str(e))
                    return error_response(f"Failed to exchange {backend} code for token: {str(e)}")

            if not access_token:
                return error_response("Authentication failed. No access token provided or found.")

            # Authenticate user — creates account if it doesn't exist
            print(f"DEBUG: Authenticating user with token for backend: {backend}")
            user = auth_backend.do_auth(access_token)
            print(f"DEBUG: User object: {user}")

            if not user:
                return error_response(f"{backend.capitalize()} authentication failed. Token may be invalid or expired.")

            if not user.is_active:
                return error_response("This account is disabled.", status_code=status.HTTP_403_FORBIDDEN)

            # Ensure profile exists
            UserProfile.objects.get_or_create(user=user)

            # Issue JWT tokens
            refresh = RefreshToken.for_user(user)
            return success_response(
                data={
                    "user": UserSerializer(user, context={"request": request}).data,
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
                message=f"Logged in successfully via {backend.split('-')[0].capitalize()}."
            )

        except AuthException as e:
            logger.warning("Social auth AuthException: %s", str(e))
            return error_response(f"Social authentication error: {str(e)}", status_code=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Social login unexpected error for backend=%s", backend)
            return error_response("An unexpected error occurred during social login.")



class RegisterView(APIView):
    """POST /api/v1/auth/register/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create profile
        UserProfile.objects.get_or_create(user=user)

        # Issue tokens
        refresh = RefreshToken.for_user(user)
        return created_response(
            data={
                "user": UserSerializer(user, context={"request": request}).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            message="Account created successfully. Welcome to CloudLab!",
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/ — Returns JWT tokens + user info."""
    serializer_class = CloudLabTokenObtainSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklists the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return success_response(message="Logged out successfully.")
        except Exception as exc:
            return error_response(message=str(exc))


class MeView(RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/ — Current user's own profile."""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UpdateProfileSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UserSerializer(user, context={"request": request})
        return success_response(data=serializer.data)

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = UpdateProfileSerializer(user, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(
            data=UserSerializer(user, context={"request": request}).data,
            message="Profile updated.",
        )


class DashboardView(APIView):
    """GET /api/v1/users/me/dashboard/ — Aggregated stats for the dashboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.labs.models import LabSession
        from apps.labs.serializers import LabListSerializer, LabSessionSerializer

        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)

        # Recent sessions (last 5)
        recent_sessions = (
            LabSession.objects.filter(user=user)
            .select_related("lab", "lab__category")
            .order_by("-started_at")[:5]
        )

        # Recommended labs (not yet completed, same category as recent)
        completed_lab_ids = LabSession.objects.filter(
            user=user, status=LabSession.Status.COMPLETED
        ).values_list("lab_id", flat=True)

        from apps.labs.models import Lab
        recommended = (
            Lab.objects.filter(is_published=True)
            .exclude(id__in=completed_lab_ids)
            .order_by("-total_completions")[:6]
        )

        return success_response(data={
            "user": UserSerializer(user, context={"request": request}).data,
            "stats": {
                "total_labs_completed": profile.total_labs_completed,
                "total_points": profile.total_points,
                "streak_days": profile.streak_days,
            },
            "recent_sessions": LabSessionSerializer(
                recent_sessions, many=True, context={"request": request}
            ).data,
            "recommended_labs": LabListSerializer(
                recommended, many=True, context={"request": request}
            ).data,
        })


class UserHistoryView(APIView):
    """GET /api/v1/users/me/history/ — Completed lab sessions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.labs.models import LabSession
        from apps.labs.serializers import LabSessionSerializer

        sessions = (
            LabSession.objects.filter(user=request.user, status=LabSession.Status.COMPLETED)
            .select_related("lab", "lab__category")
            .order_by("-completed_at")
        )
        from cloudlab.core.utils.pagination import StandardResultsPagination
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(sessions, request)
        serializer = LabSessionSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class LeaderboardView(APIView):
    """GET /api/v1/users/leaderboard/ — Top users by points."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        top_users = (
            User.objects.filter(is_active=True)
            .select_related("profile")
            .order_by("-profile__total_points")[:50]
        )
        serializer = LeaderboardEntrySerializer(top_users, many=True)
        return success_response(data=serializer.data)


class PublicProfileView(APIView):
    """GET /api/v1/users/<username>/profile/ — Public user profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        try:
            user = User.objects.select_related("profile").prefetch_related("badges__badge").get(
                username=username
            )
        except User.DoesNotExist:
            return error_response("User not found.", status_code=status.HTTP_404_NOT_FOUND)
        serializer = PublicUserSerializer(user, context={"request": request})
        return success_response(data=serializer.data)
