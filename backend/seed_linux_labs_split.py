import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cloudlab.settings.development')
django.setup()

from apps.labs.models import LabCategory, Lab, LabTask
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

category = LabCategory.objects.get(slug='linux')

# Delete old combined lab
Lab.objects.filter(slug='linux-basics-1').delete()

def create_lab(slug, title, desc, points, task_data):
    lab, _ = Lab.objects.update_or_create(
        slug=slug,
        defaults={
            'title': title,
            'category': category,
            'difficulty': 'beginner',
            'duration_minutes': 15,
            'environment_type': 'linux',
            'docker_image': 'ubuntu:22.04',
            'description': desc,
            'short_description': 'A beginner-friendly introduction to the Linux command line.',
            'points_reward': points,
            'is_free': True,
            'is_published': True,
            'created_by': user
        }
    )
    LabTask.objects.filter(lab=lab).delete()
    LabTask.objects.create(
        lab=lab,
        order=1,
        title=task_data['title'],
        description=task_data['desc'],
        hint=task_data['hint'],
        validation_type='script',
        validation_script=task_data['script'],
        points=points
    )
    print(f"Created lab: {title}")

# Lab 1
create_lab('linux-create-file', 'Linux: Create a File and Write to It',
           'Master the essential Linux commands. Learn how to create files and manage directories.',
           50,
           {
               'title': 'Create a File',
               'desc': '**Objective:** Use `echo` and output redirection to create a file with specific content.\n\n**Instructions:** Create a file called `hello.txt` in `/home/cloudlab/` containing exactly the text `Hello CloudLab`.',
               'hint': 'You can use the `>` operator to redirect the output of the `echo` command into a file. For example: `echo "some text" > /path/to/file.txt`',
               'script': '#!/bin/bash\nFILE="/home/cloudlab/hello.txt"\nif [ -f "$FILE" ] && grep -qx "Hello CloudLab" "$FILE"; then\n  echo "PASS"\n  exit 0\nfi\necho "FAIL"\nexit 1\n'
           })

# Lab 2
create_lab('linux-create-dir', 'Linux: Create a Directory Structure',
           'Learn how to manage complex nested directories.',
           50,
           {
               'title': 'Create Directories',
               'desc': '**Objective:** Practice `mkdir` with the `-p` flag to create nested directories in one command.\n\n**Instructions:** Create the directory path `/home/cloudlab/projects/devops/scripts` using a single command.',
               'hint': 'The `mkdir` command creates directories. If you want to create a full path including parent directories that don\'t exist yet, use the `-p` flag. Example: `mkdir -p /path/to/nested/dir`',
               'script': '#!/bin/bash\nif [ -d "/home/cloudlab/projects/devops/scripts" ]; then\n  echo "PASS"\n  exit 0\nfi\necho "FAIL"\nexit 1\n'
           })

# Lab 3
create_lab('linux-permissions', 'Linux: Change File Permissions',
           'Learn how to manage file security using chmod.',
           100,
           {
               'title': 'Set Permissions',
               'desc': '**Objective:** Use `chmod` to set specific permissions on a file.\n\n**Instructions:** Create a file called `run.sh` in `/home/cloudlab/` and make it executable by the owner only (permissions 744).',
               'hint': 'First, create the file using `touch`. Then, use `chmod 744` to set read, write, and execute permissions for the owner (7), and read-only for group and others (4). Example: `chmod 744 run.sh`',
               'script': '#!/bin/bash\nFILE="/home/cloudlab/run.sh"\nif [ -f "$FILE" ]; then\n  PERMS=$(stat -c "%a" "$FILE")\n  if [ "$PERMS" = "744" ]; then\n    echo "PASS"\n    exit 0\n  fi\nfi\necho "FAIL"\nexit 1\n'
           })

# Lab 4
create_lab('linux-process', 'Linux: Find a Running Process',
           'Learn how to search the process tree to find running applications.',
           100,
           {
               'title': 'Find a Process',
               'desc': '**Objective:** Use `ps` and `grep` to check if a process is running, then write its name to a file.\n\n**Instructions:** The container is running a process called `sleep`. Find it using `ps aux`, then write the word `found` into a file called `/home/cloudlab/process.txt`.',
               'hint': 'You can list all processes with `ps aux` and pipe it to `grep` using `|`. Note: the `[s]leep` pattern prevents grep from matching itself in the process list. If you see it running, simply run `echo "found" > /home/cloudlab/process.txt`.',
               'script': '#!/bin/bash\nif ps aux | grep -q "[s]leep" && \\\n   [ -f "/home/cloudlab/process.txt" ] && \\\n   grep -qx "found" "/home/cloudlab/process.txt"; then\n  echo "PASS"\n  exit 0\nfi\necho "FAIL"\nexit 1\n'
           })
