from rest_framework import serializers

class HandleMessageSerializer(serializers.Serializer):
    message = serializers.CharField(allow_blank=True, required=False)
    file = serializers.FileField(required=False)