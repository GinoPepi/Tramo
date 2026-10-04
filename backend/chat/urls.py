# my_app/urls.py
from django.urls import path, include
from .views import HandleMessageView, NotebookViewSet, DocumentViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'notebooks', NotebookViewSet, basename='notebook')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    # Add your API endpoints here
    path('messages/', HandleMessageView.as_view(), name='handle_message'),

    path('', include(router.urls)),
]

