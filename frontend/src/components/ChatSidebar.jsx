import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, AlertTriangleIcon } from './Icons';

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
  apuntes,
  onVolverLectura,
  onGuardarApunte,
  onAvanzar,
  onVolverResumen,
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

  // Al montar el componente o cambiar de tramo, inicializa con las preguntas y respuestas existentes
  useEffect(() => {
    if (!tramo || !Array.isArray(tramo.preguntas)) return;

    const apuntesTramo = apuntes?.[tramo.id] || {};
    const msgs = [];
    let siguienteIdx = 0;

    tramo.preguntas.forEach((pregunta, idx) => {
      const resp = apuntesTramo[idx];

      if (idx === 0) {
        msgs.push({
          id: `init-${idx}`,
          emisor: 'ia',
          texto: `¡Terminaste el **Tramo ${tramoIdx + 1}**! Vamos con una pausa de fijación.\n\n${pregunta}`,
        });
      } else if (idx <= siguienteIdx) {
        msgs.push({
          id: `ia-${idx}`,
          emisor: 'ia',
          texto: `Anotado. Siguiente pregunta:\n\n${pregunta}`,
        });
      }

      if (resp) {
        msgs.push({
          id: `user-${idx}`,
          emisor: 'usuario',
          texto: resp,
        });
        siguienteIdx = idx + 1;
      }
    });

    const completado = siguienteIdx >= tramo.preguntas.length;

    if (completado && tramo.preguntas.length > 0) {
      msgs.push({
        id: 'completed-msg',
        emisor: 'ia',
        texto: '¡Excelente síntesis! Guardé tus apuntes de este tramo. Podés avanzar cuando estés listo.',
      });
      setChatCompletado(true);
      setIndicePregunta(tramo.preguntas.length - 1);
    } else {
      setChatCompletado(false);
      setIndicePregunta(siguienteIdx);
    }

    setInputMensaje('');
    setMensajes(msgs);
  }, [tramo, tramoIdx]);

  const ajustarAlturaTextarea = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      if (!inputMensaje) {
        textareaRef.current.style.height = 'auto';
      } else {
        ajustarAlturaTextarea(textareaRef.current);
      }
    }
  }, [inputMensaje]);

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

  const handleReiniciarChat = () => {
    if (!tramo || !Array.isArray(tramo.preguntas) || tramo.preguntas.length === 0) return;
    setChatCompletado(false);
    setIndicePregunta(0);
    setMensajes([
      {
        id: `init-0`,
        emisor: 'ia',
        texto: `¡Terminaste el **Tramo ${tramoIdx + 1}**! Vamos con una pausa de fijación.\n\n${tramo.preguntas[0]}`,
      },
    ]);
    setInputMensaje('');
  };

  return (
    <div className="chat-layout">
      {/* Subcabecera con navegación y contexto */}
      <div className="chat-subheader">
        {onVolverLectura && (
          <button
            type="button"
            onClick={onVolverLectura}
            className="btn-chat-back"
            title="Volver a la lectura de este tramo"
            aria-label="Volver a la lectura"
          >
            <ChevronLeftIcon size={14} className="btn-return-chevron" />
            <span>Volver a lectura</span>
          </button>
        )}

        <div className="chat-subheader-status-group">
          {onVolverResumen && (
            <button
              type="button"
              onClick={onVolverResumen}
              className="btn-chat-back"
              title="Volver a las notas de la sesión"
              aria-label="Volver a notas"
            >
              <span>Notas</span>
              <ChevronRightIcon size={14} className="btn-return-chevron-right" />
            </button>
          )}
          {!onVolverResumen && (
            <div className="chat-subheader-status">
              <span className="chat-status-pulse-dot" />
              <span className="chat-subheader-subtitle">Pausa de fijación</span>
            </div>
          )}
        </div>
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
              <span className="advance-card-icon" aria-label="Aviso">
                <AlertTriangleIcon size={16} />
              </span>
              <div>
                <h4>¡Ronda de fijación completada!</h4>
                <p>Tus apuntes se guardaron</p>
              </div>
            </div>
            <div className="chat-advance-buttons-group">
              <button
                type="button"
                onClick={handleReiniciarChat}
                className="btn-chat-reset"
                title="Volver a responder las preguntas de este tramo"
              >
                Volver a responder
              </button>
              <button
                type="button"
                onClick={onAvanzar}
                className="btn-advance-action"
              >
                {onVolverResumen ? 'Volver a notas de la sesión' : (tramoIdx + 1 < totalTramos ? 'Avanzar al siguiente tramo →' : 'Ver resumen completo →')}
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Barra de entrada con Textarea */}
      <form onSubmit={handleEnviar} className="chat-input-bar">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            rows="1"
            placeholder={
              chatCompletado
                ? 'Ronda completada. Podés avanzar al siguiente tramo.'
                : 'Escribí tu síntesis o respuesta... (Enter para enviar)'
            }
            value={inputMensaje}
            disabled={chatCompletado || escribiendoIA}
            onChange={(e) => {
              setInputMensaje(e.target.value);
              ajustarAlturaTextarea(e.target);
            }}
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
      </form>
    </div>
  );
}