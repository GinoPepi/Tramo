from rest_framework import serializers

class HandleMessageSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=100, allow_blank=False)