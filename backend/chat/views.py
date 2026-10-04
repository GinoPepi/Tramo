from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notebook, Document
from .serializers import (
    NotebookSerializer,
    DocumentSerializer,
    HandleMessageSerializer,
)

class HandleMessageView(APIView):

    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        # 1. Pass React's JSON data to the Serializer
        serializer = HandleMessageSerializer(data=request.data)
        
        # 2. Check if the data is valid (e.g., price is a valid number)
        if serializer.is_valid():
            
            # 3. Extract the clean, safe Python data
            clean_msg = serializer.validated_data.get('message')
            uploaded_file = serializer.validated_data.get('file')
            
            # 4. Call your "Brain" file
            #llm_response = handle_message(clean_msg)
            llm_response = handle_message(clean_msg, uploaded_file)
            
            # 5. Return the JSON response to React
            return Response({"llm_response": llm_response}, status=status.HTTP_200_OK)
            
        # If React sent bad data, instantly return a 400 error explaining exactly what was wrong
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NotebookViewSet(viewsets.ModelViewSet):
    queryset = Notebook.objects.all().prefetch_related('documents')
    serializer_class = NotebookSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        archivo = self.request.FILES.get('file')
        title = self.request.data.get('title')

        if not title and archivo:
            title = archivo.name.replace('.pdf', '')

        serializer.save(title=title)