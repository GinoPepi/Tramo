from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth.models import User
from allauth.account.models import EmailAddress
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView
from .services.llm_service import create_tramos

from .models import Notebook, Document
from .serializers import (
    NotebookSerializer,
    DocumentSerializer,
)

class NotebookViewSet(viewsets.ModelViewSet):
    serializer_class = NotebookSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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

    def perform_create(self, serializer):
        notebook = serializer.validated_data.get('notebook')
        if notebook and notebook.user != self.request.user:
            raise PermissionDenied("No tenés permiso para agregar documentos a este cuaderno.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='start-session')
    def start_session(self, request, pk=None):
        document = self.get_object()
        tramos = create_tramos(document)
        return Response(tramos, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit-answer')
    def submit_answer(self, request, pk=None):
        document = self.get_object()
        tramo_id = request.data.get('tramo_id')
        pregunta_idx = request.data.get('pregunta_idx')
        respuesta = request.data.get('respuesta', '')
        if tramo_id is None or pregunta_idx is None:
            return Response(
                {"error": "tramo_id y pregunta_idx required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        key = f"t{tramo_id}_q{pregunta_idx}"
        temp = dict(document.temp_answers)
        temp[key] = {
            "tramo_id": tramo_id,
            "pregunta_idx": pregunta_idx,
            "respuesta": respuesta,
        }
        document.temp_answers = temp
        document.save(update_fields=['temp_answers'])
        return Response(
            {"status": "saved", "key": key, "answer": temp[key]},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], url_path='finish-session')
    def finish_session(self, request, pk=None):
        document = self.get_object()
        action_type = request.data.get('action')  # 'overwrite' o 'discard'
        if action_type == 'overwrite':
            updated_answers = dict(document.answers)
    
            # Se pisan/actualizan únicamente las preguntas que cambiaron en esta sesión
            updated_answers.update(document.temp_answers)
            document.answers = updated_answers
            document.temp_answers = {}
            document.save(update_fields=['answers', 'temp_answers'])
            return Response(
                {"status": "overwritten", "answers": document.answers},
                status=status.HTTP_200_OK
            )
        elif action_type == 'discard':
            document.temp_answers = {}
            document.save(update_fields=['temp_answers'])
            return Response(
                {"status": "discarded", "answers": document.answers},
                status=status.HTTP_200_OK
            )
        return Response(
            {"error": "Acción inválida. Usa 'overwrite' o 'discard'."},
            status=status.HTTP_400_BAD_REQUEST
        )

class CheckEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'El correo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        email_record = EmailAddress.objects.filter(email__iexact=email).first()
        user_exists = User.objects.filter(email__iexact=email).exists()

        if email_record:
            return Response({
                'exists': True,
                'verified': email_record.verified,
            }, status=status.HTTP_200_OK)
        elif user_exists:
            return Response({
                'exists': True,
                'verified': False,
            }, status=status.HTTP_200_OK)

        return Response({
            'exists': False,
            'verified': False,
        }, status=status.HTTP_200_OK)


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter