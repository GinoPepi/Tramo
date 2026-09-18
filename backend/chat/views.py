# my_app/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import HandleMessageSerializer
from .services.llm_service import handle_message

class HandleMessageView(APIView):
    def post(self, request):
        # 1. Pass React's JSON data to the Serializer
        serializer = HandleMessageSerializer(data=request.data)
        
        # 2. Check if the data is valid (e.g., price is a valid number)
        if serializer.is_valid():
            
            # 3. Extract the clean, safe Python data
            clean_msg = serializer.validated_data['message']
            
            # 4. Call your "Brain" file
            llm_response = handle_message(clean_msg)
            
            # 5. Return the JSON response to React
            return Response({"llm_response": llm_response}, status=status.HTTP_200_OK)
            
        # If React sent bad data, instantly return a 400 error explaining exactly what was wrong
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)