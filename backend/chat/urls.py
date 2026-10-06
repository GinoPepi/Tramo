# my_app/urls.py
from django.urls import path, include
from .views import NotebookViewSet, DocumentViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    # Add your API endpoints here
    path('', include(router.urls)),
]

