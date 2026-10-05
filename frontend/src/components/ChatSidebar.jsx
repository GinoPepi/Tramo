import React, { useState, useEffect, useRef } from 'react';

function formatMessageText(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

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
  const textareaRef = useRef(null);

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

  // Autofoco al textarea cuando no esté deshabilitado
  useEffect(() => {
    if (!chatCompletado && !escribiendoIA) {
      textareaRef.current?.focus();
    }
  }, [chatCompletado, escribiendoIA, indicePregunta]);

  const handleEnviar = (e) => {
    if (e && e.preventDefault) e.preventDefault();
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

    // 3. Respuesta de la IA
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
        <div className="chat-subheader-left">
          <span className="step-badge warning">Active Recall</span>
          <span className="chat-subheader-subtitle">Pausa de fijación</span>
        </div>
        <span className="chat-subheader-progress">
          Tramo {tramoIdx + 1} de {totalTramos}
        </span>
      </div>

      {/* Historial de la conversación */}
      <div className="chat-messages-container">
        {mensajes.map((m) => (
          <div key={m.id} className={`chat-message-row ${m.emisor}`}>
            <div className="chat-bubble">{formatMessageText(m.texto)}</div>
          </div>
        ))}

        {escribiendoIA && (
          <div className="chat-message-row ia">
            <div className="chat-bubble typing">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        {/* Botón para continuar cuando termina la ronda */}
        {chatCompletado && (
          <div className="chat-advance-card">
            <div className="advance-card-text">
              <span className="advance-card-icon">✓</span>
              <div>
                <h4>¡Ronda de fijación completada!</h4>
                <p>Tus apuntes se guardaron en la memoria de la sesión.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onAvanzar}
              className="btn-advance-action"
            >
              {tramoIdx + 1 < totalTramos ? 'Avanzar al siguiente tramo →' : 'Ver resumen completo →'}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de entrada con Textarea */}
      <form onSubmit={handleEnviar} className="chat-input-bar">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            rows="2"
            placeholder={
              chatCompletado
                ? 'Ronda completada. Podés avanzar al siguiente tramo.'
                : 'Escribí tu síntesis o respuesta... (Enter para enviar)'
            }
            value={inputMensaje}
            disabled={chatCompletado || escribiendoIA}
            onChange={(e) => setInputMensaje(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEnviar(e);
              }
            }}
            className="chat-textarea"
          />
          <button
            type="submit"
            className="btn-chat-send"
            disabled={!inputMensaje.trim() || chatCompletado || escribiendoIA}
            title="Enviar respuesta (Enter)"
            aria-label="Enviar respuesta"
          >
            ↑
          </button>
        </div>
        <span className="chat-input-hint">
          {chatCompletado ? 'Ronda finalizada' : 'Enter para enviar · Shift+Enter para salto de línea'}
        </span>
      </form>
    </div>
  );
}