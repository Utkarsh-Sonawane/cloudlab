"""
Docker service — Task validation inside containers.
Runs the lab's validation_script inside the user's container and
interprets the result as PASS or FAIL.
"""

import logging
import re

import docker

from .manager import _get_client

logger = logging.getLogger("cloudlab.validator")

PASS_STRINGS = {"PASS", "PASSED", "SUCCESS", "OK", "TRUE", "1"}
FAIL_STRINGS = {"FAIL", "FAILED", "ERROR", "FALSE", "0"}


def validate_task_in_container(
    container_id: str,
    validation_script: str,
    validation_type: str = "script",
    expected_output: str = "",
    workdir: str = "/",
) -> dict:
    """
    Execute the validation script inside the container and return a result dict:
      { passed: bool, message: str, exit_code: int, raw_output: str }
    """
    if not container_id:
        return _fail("No container associated with this session.")
    if not validation_script:
        return _pass("No validation script defined — auto-passed.")

    try:
        client = _get_client()
        container = client.containers.get(container_id)

        # Execute the script using sh


        import base64
        encoded_script = base64.b64encode(validation_script.encode("utf-8")).decode("utf-8")
        exec_result = container.exec_run(
            cmd=["sh", "-c", f"echo {encoded_script} | base64 -d | sh"],
            stdout=True,
            stderr=True,
            demux=False,
            workdir=workdir,
        )

        exit_code = exec_result.exit_code
        raw_output = (exec_result.output or b"").decode("utf-8", errors="replace").strip()

        logger.debug(
            "Validation result: container=%s exit_code=%s output=%r",
            container_id[:12], exit_code, raw_output[:200],
        )

        return _interpret_result(exit_code, raw_output, validation_type, expected_output)

    except docker.errors.NotFound:
        return _fail("Lab container not found. Session may have expired.")
    except docker.errors.DockerException as exc:
        logger.error("Docker error during validation: %s", exc)
        return _fail(f"Validation error: {str(exc)}")
    except Exception as exc:
        logger.exception("Unexpected error during task validation")
        return _fail(f"Unexpected error: {str(exc)}")


def _interpret_result(exit_code: int, raw_output: str, validation_type: str, expected_output: str) -> dict:
    """Determine pass/fail based on exit code, output, and validation type."""

    if validation_type == "script":
        # Primary: exit code; secondary: output contains PASS
        if exit_code == 0:
            upper = raw_output.upper()
            # If output explicitly says FAIL, fail it
            if any(f in upper for f in FAIL_STRINGS):
                return _fail(raw_output or "Validation failed.")
            return _pass(raw_output or "Task completed successfully!")
        else:
            return _fail(raw_output or "Validation script exited with non-zero code.")

    elif validation_type == "command_output":
        if expected_output and re.search(expected_output, raw_output, re.IGNORECASE):
            return _pass("Output matched expected pattern.")
        return _fail(f"Expected pattern not found in output.\nGot: {raw_output[:300]}")

    elif validation_type == "file_exists":
        if exit_code == 0:
            return _pass(f"File exists: {raw_output}")
        return _fail(f"File not found: {expected_output}")

    elif validation_type == "api_check":
        if exit_code == 0 and "200" in raw_output:
            return _pass("API endpoint responded successfully.")
        return _fail(f"API check failed.\nOutput: {raw_output[:300]}")

    # Fallback
    if exit_code == 0:
        return _pass(raw_output or "Task completed!")
    return _fail(raw_output or "Validation failed.")


def _pass(message: str) -> dict:
    return {"passed": True, "message": message}


def _fail(message: str) -> dict:
    return {"passed": False, "message": message}
