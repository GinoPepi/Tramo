# my_app/urls.py
from django.urls import path
from .views import HandleMessageView # Import your views here

urlpatterns = [
    # Add your API endpoints here
    path('messages/', HandleMessageView.as_view(), name='handle_message'),
]