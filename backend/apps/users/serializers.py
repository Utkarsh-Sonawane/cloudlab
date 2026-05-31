"""Users app — DRF serializers."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Badge, UserBadge, UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "bio", "linkedin_url", "github_url", "website_url",
            "total_labs_completed", "total_points", "streak_days", "last_active",
        ]
        read_only_fields = ["total_labs_completed", "total_points", "streak_days", "last_active"]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "description", "icon_url", "category"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["badge", "earned_at"]


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer — used for the /me/ endpoint."""
    profile = UserProfileSerializer(read_only=True)
    badges = UserBadgeSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "username", "full_name", "avatar_url",
            "role", "plan", "is_verified", "github_username",
            "created_at", "profile", "badges",
        ]
        read_only_fields = ["id", "email", "role", "plan", "is_verified", "created_at"]


class PublicUserSerializer(serializers.ModelSerializer):
    """Public user profile — excludes sensitive info."""
    profile = UserProfileSerializer(read_only=True)
    badges = UserBadgeSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "full_name", "avatar_url",
            "role", "github_username", "created_at", "profile", "badges",
        ]


class RegisterSerializer(serializers.ModelSerializer):
    """User registration serializer."""
    password = serializers.CharField(write_only=True, min_length=8, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label="Confirm password")

    class Meta:
        model = User
        fields = ["email", "username", "full_name", "password", "password2"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        user = User.objects.create_user(**validated_data)
        return user


class CloudLabTokenObtainSerializer(TokenObtainPairSerializer):
    """Extended JWT serializer that includes user info in the response."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        token["plan"] = user.plan
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Partial update for user + profile."""
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["full_name", "avatar_url", "github_username", "profile"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        return instance


class DashboardSerializer(serializers.Serializer):
    """Aggregated stats for the user dashboard."""
    user = UserSerializer()
    recent_sessions = serializers.ListField()
    recommended_labs = serializers.ListField()
    stats = serializers.DictField()


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    total_points = serializers.IntegerField(source="profile.total_points")
    total_labs_completed = serializers.IntegerField(source="profile.total_labs_completed")
    streak_days = serializers.IntegerField(source="profile.streak_days")

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "avatar_url", "total_points",
                  "total_labs_completed", "streak_days"]


class SocialAuthSerializer(serializers.Serializer):
    """Serializer for social authentication (Google/GitHub)."""
    provider = serializers.CharField()
    access_token = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    redirect_uri = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("access_token") and not attrs.get("code"):
            raise serializers.ValidationError("Either access_token or code is required.")
        return attrs

