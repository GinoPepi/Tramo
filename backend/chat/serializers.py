from rest_framework import serializers
from .models import Notebook, Document

# Document serializer
class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'notebook', 'title', 'file', 'status', 'tramos', 'created_at']
        read_only_fields = ['status', 'tramos', 'created_at']


# Notebook serializer
class NotebookSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Notebook
        fields = ['id', 'name', 'description', 'documents', 'created_at']