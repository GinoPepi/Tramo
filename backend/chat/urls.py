from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotebookViewSet,
    DocumentViewSet,
    LoginView,
    RegisterView,
    GoogleAuthView,
    LogoutView,
    MeView,
)

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/google/', GoogleAuthView.as_view(), name='auth-google'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]
