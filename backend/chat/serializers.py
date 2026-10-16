from rest_framework import serializers
from .models import Notebook, Document

# Document serializer
class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'notebook', 'title', 'file', 'syllabus_text', 'syllabus_file', 'status', 'tramos', 'answers', 'temp_answers', 'created_at']
        read_only_fields = ['status', 'tramos', 'created_at']


# Notebook serializer
class NotebookSerializer(serializers.ModelSerializer):
    documents = DocumentSerializer(many=True, read_only=True)

    class Meta:
        model = Notebook
        fields = ['id', 'user', 'name', 'description', 'syllabus_text', 'syllabus_file', 'documents', 'created_at']
        read_only_fields = ['user', 'created_at']


# Custom registration serializer to capture first_name
from dj_rest_auth.registration.serializers import RegisterSerializer

class CustomRegisterSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=False, allow_blank=True)

    def get_cleaned_data(self):
        data_dict = super().get_cleaned_data()
        data_dict['first_name'] = self.validated_data.get('first_name', '')
        return data_dict

    def custom_signup(self, request, user):
        first_name = self.cleaned_data.get('first_name', '').strip()
        if first_name:
            user.first_name = first_name
            user.save(update_fields=['first_name'])