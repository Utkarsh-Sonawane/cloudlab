"""Labs app — DRF serializers."""

from rest_framework import serializers

from .models import Lab, LabCategory, LabRating, LabSession, LabSessionTask, LabTask


class LabCategorySerializer(serializers.ModelSerializer):
    lab_count = serializers.SerializerMethodField()

    class Meta:
        model = LabCategory
        fields = ["id", "name", "slug", "icon", "description", "color", "lab_count"]

    def get_lab_count(self, obj):
        return obj.labs.filter(is_published=True).count()


class LabTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTask
        fields = [
            "id", "order", "title", "description",
            "validation_type", "points",
            # hint & validation_script are sent separately (security)
        ]


class LabTaskDetailSerializer(serializers.ModelSerializer):
    """Full task detail including hint (no validation_script — server-side only)."""
    class Meta:
        model = LabTask
        fields = ["id", "order", "title", "description", "hint", "validation_type", "points"]


class LabListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for lab catalog cards."""
    category = LabCategorySerializer(read_only=True)
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Lab
        fields = [
            "id", "title", "slug", "short_description", "thumbnail_url",
            "category", "difficulty", "duration_minutes", "environment_type",
            "points_reward", "is_free", "avg_rating", "total_completions", "task_count",
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()


class LabDetailSerializer(serializers.ModelSerializer):
    """Full lab detail including all tasks."""
    category = LabCategorySerializer(read_only=True)
    tasks = LabTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Lab
        fields = [
            "id", "title", "slug", "description", "short_description", "thumbnail_url",
            "category", "difficulty", "duration_minutes", "environment_type",
            "docker_image", "points_reward", "is_free", "avg_rating",
            "total_completions", "tasks", "created_at",
        ]


class LabSessionTaskSerializer(serializers.ModelSerializer):
    task = LabTaskSerializer(read_only=True)

    class Meta:
        model = LabSessionTask
        fields = ["id", "task", "status", "completed_at", "attempts"]


class LabSessionSerializer(serializers.ModelSerializer):
    """Lab session including task statuses."""
    lab = LabListSerializer(read_only=True)
    session_tasks = LabSessionTaskSerializer(many=True, read_only=True)
    current_task = serializers.SerializerMethodField()

    class Meta:
        model = LabSession
        fields = [
            "id", "lab", "status", "container_id",
            "websocket_token", "current_task_index",
            "started_at", "expires_at", "completed_at",
            "session_tasks", "current_task",
        ]

    def get_current_task(self, obj):
        tasks = list(obj.lab.tasks.order_by("order"))
        idx = obj.current_task_index
        if idx < len(tasks):
            return LabTaskDetailSerializer(tasks[idx]).data
        return None


class LabRatingSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = LabRating
        fields = ["id", "username", "rating", "comment", "created_at"]
        read_only_fields = ["id", "username", "created_at"]


class ValidationResultSerializer(serializers.Serializer):
    """Result of a task validation attempt."""
    passed = serializers.BooleanField()
    message = serializers.CharField()
    task_index = serializers.IntegerField()
    all_tasks_complete = serializers.BooleanField()
    points_earned = serializers.IntegerField(required=False)
