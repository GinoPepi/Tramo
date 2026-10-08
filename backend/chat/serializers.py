from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Notebook, Document

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'password']

    def validate_email(self, value):
        normalized_email = value.lower().strip()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("Ya existe un usuario registrado con este correo electrónico.")
        return normalized_email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', '').strip(),
            password=validated_data['password']
        )
        return user


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
        fields = ['id', 'user', 'name', 'description', 'documents', 'created_at']
        read_only_fields = ['user', 'created_at']