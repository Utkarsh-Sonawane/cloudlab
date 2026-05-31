"""Celery application for CloudLab."""

import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cloudlab.settings.development")

app = Celery("cloudlab")

# Load configuration from Django settings, using CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# ── Periodic Tasks (Celery Beat) ─────────────────────────────────────────────

app.conf.beat_schedule = {
    # Cleanup expired lab sessions every 5 minutes
    "cleanup-expired-sessions": {
        "task": "tasks.lab_tasks.cleanup_expired_sessions",
        "schedule": crontab(minute="*/5"),
    },
    # Cleanup expired playground sessions every 5 minutes
    "cleanup-expired-playground-sessions": {
        "task": "tasks.lab_tasks.cleanup_expired_playground_sessions",
        "schedule": crontab(minute="*/5"),
    },
    # Collect and push Prometheus metrics every minute
    "collect-metrics": {
        "task": "tasks.metrics_tasks.collect_lab_metrics",
        "schedule": crontab(minute="*"),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
