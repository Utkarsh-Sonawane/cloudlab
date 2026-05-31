"""
Standard API response helpers.
All API responses follow the same envelope format:
  { success: bool, data: any, message: str, errors: dict }
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def success_response(data=None, message="", status_code=status.HTTP_200_OK):
    """Return a standardized success response."""
    return Response(
        {
            "success": True,
            "message": message,
            "data": data,
            "errors": None,
        },
        status=status_code,
    )


def error_response(message="An error occurred.", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """Return a standardized error response."""
    return Response(
        {
            "success": False,
            "message": message,
            "data": None,
            "errors": errors or {},
        },
        status=status_code,
    )


def created_response(data=None, message="Created successfully."):
    """Return a 201 Created success response."""
    return success_response(data=data, message=message, status_code=status.HTTP_201_CREATED)


def no_content_response(message="Deleted successfully."):
    """Return a 204 No Content response."""
    return Response(status=status.HTTP_204_NO_CONTENT)


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that wraps errors in the standard envelope.
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_data = response.data
        if isinstance(error_data, list):
            detail = "; ".join(str(e) for e in error_data)
            errors = {"non_field_errors": error_data}
        elif isinstance(error_data, dict):
            detail = error_data.pop("detail", "Validation error.")
            if hasattr(detail, "code"):
                detail = str(detail)
            errors = error_data if error_data else {}
        else:
            detail = str(error_data)
            errors = {}

        response.data = {
            "success": False,
            "message": str(detail),
            "data": None,
            "errors": errors,
        }

    return response
