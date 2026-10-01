import React, { useState, useEffect, useRef } from 'react';

export default function ChatSidebar({
  tramo,
  tramoIdx,
  totalTramos,
  onGuardarApunte,
  onAvanzar,
}) {
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [indicePregunta, setIndicePregunta] = useState(0);
  const [chatCompletado, setChatCompletado] = useState(false);
  const [escribiendoIA, setEscribiendoIA] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll al final con cada mensaje nuevo
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, escribiendoIA]);

  // Al montar el componente o cambiar de tramo, inicializa con la primera pregunta
  useEffect(() => {
    if (!tramo) return;

    setIndicePregunta(0);
    setChatCompletado(false);
    setInputMensaje('');

    setMensajes([
      {
        id: Date.now(),
        emisor: 'ia',
        texto: `¡Terminaste el **Tramo ${tramoIdx + 1}**! Vamos con una pausa de fijación.\n\n${tramo.preguntas[0]}`,
      },
    ]);
  }, [tramo, tramoIdx]);

  const handleEnviar = (e) => {
    e.preventDefault();
    const texto = inputMensaje.trim();
    if (!texto || escribiendoIA || chatCompletado) return;

    // 1. Mensaje del estudiante en la interfaz
    const mensajeUsuario = {
      id: Date.now(),
      emisor: 'usuario',
      texto,
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    setInputMensaje('');

    // 2. Guardar el apunte en el estado general
    if (onGuardarApunte) {
      onGuardarApunte(tramo.id, indicePregunta, texto);
    }

    // 3. Respuesta de la IA (Simulación lista para reemplazar con fetch)
    const siguientePreguntaIdx = indicePregunta + 1;
    setEscribiendoIA(true);

    setTimeout(() => {
      setEscribiendoIA(false);

      if (siguientePreguntaIdx < tramo.preguntas.length) {
        setIndicePregunta(siguientePreguntaIdx);
        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            emisor: 'ia',
            texto: `Anotado. Siguiente pregunta:\n\n${tramo.preguntas[siguientePreguntaIdx]}`,
          },
        ]);
      } else {
        setChatCompletado(true);
        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            emisor: 'ia',
            texto: '¡Excelente síntesis! Guardé tus apuntes de este tramo. Podés avanzar cuando estés listo.',
          },
        ]);
      }
    }, 700);
  };

  return (
    <div className="chat-layout">
      {/* Subcabecera con contexto del tramo */}
      <div className="chat-subheader">
        <span className="step-badge warning">Active Recall</span>
        <small>Tramo {tramoIdx + 1} de {totalTramos}</small>
      </div>

      {/* Historial de la conversación */}
      <div className="chat-messages-container">
        {mensajes.map((m) => (
          <div key={m.id} className={`chat-message-row ${m.emisor}`}>
            <div className="chat-bubble">{m.texto}</div>
          </div>
        ))}

        {escribiendoIA && (
          <div className="chat-message-row ia">
            <div className="chat-bubble typing">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}

        {/* Botón para continuar cuando termina la ronda */}
        {chatCompletado && (
          <div className="chat-advance-card">
            <button
              type="button"
              onClick={onAvanzar}
              className="btn-primary"
            >
              {tramoIdx + 1 < totalTramos ? 'Avanzar al siguiente tramo →' : 'Ver resumen completo →'}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de entrada */}
      <form onSubmit={handleEnviar} className="chat-input-bar">
        <input
          type="text"
          placeholder={chatCompletado ? 'Ronda completada.' : 'Escribí tu síntesis...'}
          value={inputMensaje}
          disabled={chatCompletado || escribiendoIA}
          onChange={(e) => setInputMensaje(e.target.value)}
          autoFocus
        />
        <button
          type="submit"
          className="btn-chat-send"
          disabled={!inputMensaje.trim() || chatCompletado || escribiendoIA}
          title="Enviar respuesta"
        >
          ↑
        </button>
      </form>
    </div>
  );
}