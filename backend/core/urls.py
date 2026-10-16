"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import os
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from dj_rest_auth.registration.views import VerifyEmailView
from chat.views import CheckEmailView, GoogleLogin

urlpatterns = [
    path('admin/', admin.site.urls),
    path('chat/', include('chat.urls')),
    path('auth/google/', GoogleLogin.as_view(), name='google_login'),
    path('auth/check-email/', CheckEmailView.as_view(), name='check_email'),
    path('auth/', include('dj_rest_auth.urls')),
    path('auth/registration/', include('dj_rest_auth.registration.urls')),
    path('auth/account-confirm-email/<str:key>/', RedirectView.as_view(url='http://localhost:5173/verify-email/%(key)s/', permanent=False), name='account_confirm_email'),
    path('auth/account-confirm-email/', VerifyEmailView.as_view(), name='account_email_verification_sent'),
]

if settings.DEBUG:
    urlpatterns += static(
        '/documents/', 
        document_root=os.path.join(settings.BASE_DIR, 'documents')
    )