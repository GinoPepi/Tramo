from rest_framework import serializers
from .models import Notebook, Document

# Chat existente
class HandleMessageSerializer(serializers.Serializer):
    message = serializers.CharField(allow_blank=True, required=False)
    file = serializers.FileField(required=False)


# Serializador de Documentos
class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'notebook', 'title', 'file', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']


# Serializador de Notebooks (con sus documentos anidados)
class NotebookSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Notebook
        fields = ['id', 'name', 'description', 'documents', 'created_at']