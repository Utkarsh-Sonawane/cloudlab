"""Users app — Profile & Leaderboard URL routing."""

from django.urls import path

from .views import DashboardView, LeaderboardView, PublicProfileView, UserHistoryView

urlpatterns = [
    path("me/dashboard/", DashboardView.as_view(), name="user-dashboard"),
    path("me/history/", UserHistoryView.as_view(), name="user-history"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
    path("<str:username>/profile/", PublicProfileView.as_view(), name="public-profile"),
]
