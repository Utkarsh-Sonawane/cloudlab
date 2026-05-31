"""Billing app models — Plans and Subscriptions."""

import uuid

from django.conf import settings
from django.db import models


class Plan(models.Model):
    """A subscription plan available to users."""

    class PlanName(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        TEAM = "team", "Team"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=20, choices=PlanName.choices, unique=True)
    display_name = models.CharField(max_length=50)
    price_monthly = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    price_annual = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    max_concurrent_labs = models.PositiveSmallIntegerField(default=1)
    max_lab_duration_minutes = models.PositiveSmallIntegerField(default=30)
    playground_access = models.BooleanField(default=False)
    features = models.JSONField(default=list, help_text="List of feature strings for marketing display")

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "plans"

    def __str__(self):
        return self.display_name


class Subscription(models.Model):
    """A user's active subscription to a plan."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        CANCELLED = "cancelled", "Cancelled"
        TRIALING = "trialing", "Trialing"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscription"
    )
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)

    # Stripe
    stripe_subscription_id = models.CharField(max_length=200, blank=True, db_index=True)
    stripe_customer_id = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"

    def __str__(self):
        return f"{self.user.username} → {self.plan.name} ({self.status})"
