import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cloudlab.settings.development')
django.setup()

from apps.labs.models import LabCategory, Lab, LabTask
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

category = LabCategory.objects.get(slug='linux')

lab, created = Lab.objects.get_or_create(
    slug='linux-basics-1',
    defaults={
        'title': 'Linux Basics: Files and Processes',
        'category': category,
        'difficulty': 'beginner',
        'duration_minutes': 30,
        'environment_type': 'linux',
        'docker_image': 'ubuntu:22.04',
        'description': 'Master the essential Linux commands. Learn how to create files, manage directories, change permissions, and find running processes.',
        'short_description': 'A beginner-friendly introduction to the Linux command line.',
        'is_free': True,
        'is_published': True,
        'created_by': user
    }
)

if not created:
    print("Lab already exists, updating tasks...")
    LabTask.objects.filter(lab=lab).delete()

# Task 1
LabTask.objects.create(
    lab=lab,
    order=1,
    title='Create a File and Write to It',
    description='**Objective:** Use `echo` and output redirection to create a file with specific content.\n\n**Instructions:** Create a file called `hello.txt` in `/home/cloudlab/` containing exactly the text `Hello CloudLab`.',
    hint='You can use the `>` operator to redirect the output of the `echo` command into a file. For example: `echo "some text" > /path/to/file.txt`',
    validation_type='script',
    validation_script='''#!/bin/bash
FILE="/home/cloudlab/hello.txt"
if [ -f "$FILE" ] && grep -qx "Hello CloudLab" "$FILE"; then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
''',
    points=20
)

# Task 2
LabTask.objects.create(
    lab=lab,
    order=2,
    title='Create a Directory Structure',
    description='**Objective:** Practice `mkdir` with the `-p` flag to create nested directories in one command.\n\n**Instructions:** Create the directory path `/home/cloudlab/projects/devops/scripts` using a single command.',
    hint='The `mkdir` command creates directories. If you want to create a full path including parent directories that don\'t exist yet, use the `-p` flag. Example: `mkdir -p /path/to/nested/dir`',
    validation_type='script',
    validation_script='''#!/bin/bash
if [ -d "/home/cloudlab/projects/devops/scripts" ]; then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
''',
    points=20
)

# Task 3
LabTask.objects.create(
    lab=lab,
    order=3,
    title='Change File Permissions',
    description='**Objective:** Use `chmod` to set specific permissions on a file.\n\n**Instructions:** Create a file called `run.sh` in `/home/cloudlab/` and make it executable by the owner only (permissions 744).',
    hint='First, create the file using `touch`. Then, use `chmod 744` to set read, write, and execute permissions for the owner (7), and read-only for group and others (4). Example: `chmod 744 run.sh`',
    validation_type='script',
    validation_script='''#!/bin/bash
FILE="/home/cloudlab/run.sh"
if [ -f "$FILE" ]; then
  PERMS=$(stat -c "%a" "$FILE")
  if [ "$PERMS" = "744" ]; then
    echo "PASS"
    exit 0
  fi
fi
echo "FAIL"
exit 1
''',
    points=30
)

# Task 4
LabTask.objects.create(
    lab=lab,
    order=4,
    title='Find a Running Process',
    description='**Objective:** Use `ps` and `grep` to check if a process is running, then write its name to a file.\n\n**Instructions:** The container is running a process called `sleep`. Find it using `ps aux`, then write the word `found` into a file called `/home/cloudlab/process.txt`.',
    hint='You can list all processes with `ps aux` and pipe it to `grep` using `|`. Note: the `[s]leep` pattern prevents grep from matching itself in the process list. If you see it running, simply run `echo "found" > /home/cloudlab/process.txt`.',
    validation_type='script',
    validation_script='''#!/bin/bash
if ps aux | grep -q "[s]leep" && \
   [ -f "/home/cloudlab/process.txt" ] && \
   grep -qx "found" "/home/cloudlab/process.txt"; then
  echo "PASS"
  exit 0
fi
echo "FAIL"
exit 1
''',
    points=30
)

print(f"Successfully seeded lab '{lab.title}' with 4 tasks.")
