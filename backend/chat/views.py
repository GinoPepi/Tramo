from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.decorators import action
from .services.llm_service import create_tramos

from .models import Notebook, Document
from .serializers import (
    NotebookSerializer,
    DocumentSerializer,
)

class NotebookViewSet(viewsets.ModelViewSet):
    queryset = Notebook.objects.all().prefetch_related('documents')
    serializer_class = NotebookSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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