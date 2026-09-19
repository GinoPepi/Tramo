// src/services/api.js

// import.meta.env es la forma en que Vite lee el archivo .env
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Ejemplo de función para enviar mensajes al chat de Django
export const enviarMensajeChat = async (mensaje, tramoId) => {
  const response = await fetch(`${API_BASE_URL}/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mensaje,
      tramo_id: tramoId,
    }),
  });

  if (!response.ok) {
    throw new Error('Error en la comunicación con el servidor');
  }

  return response.json();
};