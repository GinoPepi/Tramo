import re
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from .services.llm_service import create_tramos

from .models import Notebook, Document
from .serializers import (
    NotebookSerializer,
    DocumentSerializer,
    UserSerializer,
    RegisterSerializer,
)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Debes proporcionar un usuario y una contraseña.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)
        if not user:
            return Response(
                {'detail': 'Credenciales incorrectas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'email': user.email,
            }
        }, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
            }
        }, status=status.HTTP_201_CREATED)


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response(
                {'detail': 'Credencial de Google no proporcionada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        idinfo = None
        # 1. Intentar validar mediante google-auth
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests

            idinfo = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
        except Exception:
            # 2. Fallback: validar contra el endpoint tokeninfo de Google
            try:
                import requests
                resp = requests.get(
                    f'https://oauth2.googleapis.com/tokeninfo?id_token={credential}',
                    timeout=10
                )
                if resp.status_code == 200:
                    idinfo = resp.json()
                else:
                    return Response(
                        {'detail': 'El token de Google es inválido o ha expirado.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as ex:
                return Response(
                    {'detail': f'Error de validación con Google: {str(ex)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not idinfo:
            return Response(
                {'detail': 'No se pudo verificar el token de Google.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = idinfo.get('email')
        if not email:
            return Response(
                {'detail': 'La cuenta de Google no contiene una dirección de correo válida.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = email.lower().strip()
        first_name = idinfo.get('given_name') or idinfo.get('name') or ''

        # Buscar usuario existente por email
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            # Crear nombre de usuario a partir del correo
            base_username = email.split('@')[0].replace('.', '_').replace('-', '_')
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username) or 'usuario'
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
            )
            user.set_unusable_password()
            user.save()
        else:
            if not user.first_name and first_name:
                user.first_name = first_name
                user.save(update_fields=['first_name'])

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Revoca / elimina el token actual del usuario autenticado
        Token.objects.filter(user=request.user).delete()
        return Response({'detail': 'Sesión cerrada correctamente.'}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'email': user.email,
        }, status=status.HTTP_200_OK)


class NotebookViewSet(viewsets.ModelViewSet):
    serializer_class = NotebookSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notebook.objects.filter(user=self.request.user).prefetch_related('documents')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Document.objects.filter(notebook__user=self.request.user)

    @action(detail=True, methods=['post'], url_path='start-session')
    def start_session(self, request, pk=None):
        document = self.get_object()
        programa = request.data.get('programa', '')
        tramos = create_tramos(document, programa)
        return Response(tramos, status=status.HTTP_200_OK)