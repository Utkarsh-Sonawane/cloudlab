"""Labs app — URL routing."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LabCategoryViewSet, LabViewSet

router = DefaultRouter()
router.register(r"categories", LabCategoryViewSet, basename="lab-category")
router.register(r"", LabViewSet, basename="lab")

urlpatterns = [
    path("", include(router.urls)),
]
