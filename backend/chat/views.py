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

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @action(detail=True, methods=['post'], url_path='start-session')
    def start_session(self, request, pk=None):
        document = self.get_object()
        programa = request.data.get('programa', '')
        tramos = create_tramos(document, programa)
        return Response(tramos, status=status.HTTP_200_OK)