"""
Management command: seed_labs
Populates the database with sample lab categories, labs, and tasks for development.
Usage: python manage.py seed_labs
"""

import json

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.labs.models import Lab, LabCategory, LabTask

User = get_user_model()

CATEGORIES = [
    {"name": "Docker", "slug": "docker", "icon": "container", "color": "#0ea5e9", "order": 1,
     "description": "Master Docker containers, images, networking, and orchestration."},
    {"name": "Kubernetes", "slug": "kubernetes", "icon": "server", "color": "#8b5cf6", "order": 2,
     "description": "Deploy, scale, and manage containerized apps with Kubernetes."},
    {"name": "Linux", "slug": "linux", "icon": "terminal", "color": "#10b981", "order": 3,
     "description": "Learn Linux fundamentals, shell scripting, and system administration."},
    {"name": "Git", "slug": "git", "icon": "git-branch", "color": "#f97316", "order": 4,
     "description": "Version control with Git — from basics to advanced workflows."},
    {"name": "Terraform", "slug": "terraform", "icon": "layers", "color": "#7c3aed", "order": 5,
     "description": "Infrastructure as Code with HashiCorp Terraform."},
    {"name": "CI/CD", "slug": "cicd", "icon": "zap", "color": "#ec4899", "order": 6,
     "description": "Build, test, and deploy pipelines with GitHub Actions and more."},
]

LABS = [
    {
        "title": "Docker Basics: Your First Container",
        "description": """## Introduction to Docker

In this lab, you'll learn the fundamentals of Docker by running your first containers.

### What you'll learn:
- How to run a Docker container from an image
- How to list running and stopped containers
- How to name a container
- How to map ports

Get ready to dive into containerization!""",
        "short_description": "Learn to run, list, and manage your first Docker containers.",
        "category_slug": "docker",
        "difficulty": "beginner",
        "duration_minutes": 30,
        "environment_type": "docker",
        "docker_image": "docker:dind",
        "points_reward": 100,
        "is_free": True,
        "tasks": [
            {
                "order": 1,
                "title": "Run your first container",
                "description": "Run a container from the `hello-world` Docker image and verify it outputs 'Hello from Docker!'",
                "hint": "Use `docker run hello-world` to run the container.",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
OUTPUT=$(docker run hello-world 2>&1)
if echo "$OUTPUT" | grep -q "Hello from Docker"; then
  echo "PASS"
  exit 0
fi
echo "FAIL: Expected 'Hello from Docker' in output"
exit 1""",
                "points": 25,
            },
            {
                "order": 2,
                "title": "Run an nginx container named 'webserver'",
                "description": "Run an nginx container in detached mode, named `webserver`, mapping port `8080` on the host to port `80` in the container.",
                "hint": "Use `docker run -d --name webserver -p 8080:80 nginx`",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
CONTAINER=$(docker ps --filter "name=^webserver$" --format "{{.Names}}")
if [ "$CONTAINER" != "webserver" ]; then
  echo "FAIL: Container 'webserver' is not running"
  exit 1
fi
PORT=$(docker port webserver 80/tcp 2>/dev/null)
if echo "$PORT" | grep -q "8080"; then
  echo "PASS"
  exit 0
fi
echo "FAIL: Port 8080 not mapped correctly"
exit 1""",
                "points": 35,
            },
            {
                "order": 3,
                "title": "List all containers",
                "description": "List all containers (running and stopped) and find the total count.",
                "hint": "Use `docker ps -a` to list all containers.",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
COUNT=$(docker ps -a --format "{{.Names}}" | wc -l)
if [ "$COUNT" -ge 1 ]; then
  echo "PASS: Found $COUNT containers"
  exit 0
fi
echo "FAIL: No containers found"
exit 1""",
                "points": 20,
            },
            {
                "order": 4,
                "title": "Stop the webserver container",
                "description": "Stop the `webserver` container that you started earlier.",
                "hint": "Use `docker stop webserver`",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
STATUS=$(docker inspect webserver --format "{{.State.Status}}" 2>/dev/null)
if [ "$STATUS" = "exited" ]; then
  echo "PASS: Container stopped"
  exit 0
fi
echo "FAIL: Container is still running (status=$STATUS)"
exit 1""",
                "points": 20,
            },
        ],
    },
    {
        "title": "Linux File System Navigation",
        "description": """## Linux File System

Master the Linux file system with hands-on practice.

### What you'll learn:
- Navigate the directory tree with `cd`, `ls`, `pwd`
- Create files and directories
- Copy, move, and delete files
- Understand file permissions""",
        "short_description": "Navigate the Linux file system and work with files and directories.",
        "category_slug": "linux",
        "difficulty": "beginner",
        "duration_minutes": 25,
        "environment_type": "linux",
        "docker_image": "ubuntu:22.04",
        "points_reward": 80,
        "is_free": True,
        "tasks": [
            {
                "order": 1,
                "title": "Create a directory called 'cloudlab'",
                "description": "Create a directory named `cloudlab` in your home directory (`/home/cloudlab` or `/root`).",
                "hint": "Use `mkdir ~/cloudlab`",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
if [ -d "$HOME/cloudlab" ] || [ -d "/root/cloudlab" ] || [ -d "/cloudlab" ]; then
  echo "PASS"
  exit 0
fi
echo "FAIL: Directory 'cloudlab' not found"
exit 1""",
                "points": 20,
            },
            {
                "order": 2,
                "title": "Create a file named 'hello.txt' inside cloudlab/",
                "description": "Inside the `cloudlab` directory, create a file named `hello.txt` containing the text `Hello, CloudLab!`.",
                "hint": "Use `echo 'Hello, CloudLab!' > ~/cloudlab/hello.txt`",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
FILE=""
if [ -f "$HOME/cloudlab/hello.txt" ]; then FILE="$HOME/cloudlab/hello.txt"; fi
if [ -f "/root/cloudlab/hello.txt" ]; then FILE="/root/cloudlab/hello.txt"; fi
if [ -z "$FILE" ]; then
  echo "FAIL: hello.txt not found in cloudlab/"
  exit 1
fi
if grep -q "Hello, CloudLab!" "$FILE"; then
  echo "PASS"
  exit 0
fi
echo "FAIL: hello.txt does not contain 'Hello, CloudLab!'"
exit 1""",
                "points": 30,
            },
            {
                "order": 3,
                "title": "Set file permissions to 644",
                "description": "Set the permissions of `hello.txt` to `644` (owner read/write, group and others read-only).",
                "hint": "Use `chmod 644 ~/cloudlab/hello.txt`",
                "validation_type": "script",
                "validation_script": """#!/bin/bash
FILE=""
if [ -f "$HOME/cloudlab/hello.txt" ]; then FILE="$HOME/cloudlab/hello.txt"; fi
if [ -f "/root/cloudlab/hello.txt" ]; then FILE="/root/cloudlab/hello.txt"; fi
PERMS=$(stat -c "%a" "$FILE" 2>/dev/null)
if [ "$PERMS" = "644" ]; then
  echo "PASS"
  exit 0
fi
echo "FAIL: Expected 644, got $PERMS"
exit 1""",
                "points": 30,
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seed the database with sample lab categories, labs, and tasks."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("🌱 Seeding lab data..."))

        # Create or get an admin user for lab ownership
        admin, _ = User.objects.get_or_create(
            email="admin@cloudlab.local",
            defaults={
                "username": "admin",
                "full_name": "CloudLab Admin",
                "role": "admin",
                "plan": "enterprise",
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True,
            },
        )
        if _:
            admin.set_password("cloudlab-admin-2024")
            admin.save()
            self.stdout.write(f"  ✅ Created admin user: admin@cloudlab.local / cloudlab-admin-2024")

        # Seed categories
        self.stdout.write("  📂 Seeding categories...")
        for cat_data in CATEGORIES:
            cat, created = LabCategory.objects.update_or_create(
                slug=cat_data["slug"],
                defaults=cat_data,
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"    {action}: {cat.name}")

        # Seed labs
        self.stdout.write("  🧪 Seeding labs...")
        for lab_data in LABS:
            tasks_data = lab_data.pop("tasks")
            category_slug = lab_data.pop("category_slug")
            category = LabCategory.objects.get(slug=category_slug)

            lab, created = Lab.objects.update_or_create(
                slug=slugify(lab_data["title"]),
                defaults={
                    **lab_data,
                    "category": category,
                    "created_by": admin,
                    "is_published": True,
                    "slug": slugify(lab_data["title"]),
                },
            )
            action = "Created" if created else "Updated"
            self.stdout.write(f"    {action}: {lab.title}")

            # Seed tasks
            for task_data in tasks_data:
                LabTask.objects.update_or_create(
                    lab=lab,
                    order=task_data["order"],
                    defaults=task_data,
                )

        self.stdout.write(self.style.SUCCESS("\n✅ Seed complete!"))
        self.stdout.write(f"   Categories: {LabCategory.objects.count()}")
        self.stdout.write(f"   Labs: {Lab.objects.count()}")
        self.stdout.write(f"   Tasks: {LabTask.objects.count()}")
