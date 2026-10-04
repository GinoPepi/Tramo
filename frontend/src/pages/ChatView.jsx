import React, { useState, useEffect, useRef } from 'react';
import './ChatView.css';
import ChatSidebar from '../components/ChatSidebar';
import { useLocation, useNavigate } from 'react-router-dom';

// Función para conectar con la API de Django
const obtenerPrimerTramoDeApi = async (programa, pdfFile) => {
  try {
    const formData = new FormData();

    if (programa) {
      formData.append('message', programa);
    }

    if (pdfFile) {
      formData.append('file', pdfFile);
    }

    const response = await fetch('http://localhost:8000/chat/messages/', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error al llamar a la API');
    }

    const data = await response.json();
    const tituloApi = data.llm_response;

    return [
      {
        id: 1,
        titulo: tituloApi,
        paginas: 'Páginas 1 a 5',
        foco: 'Identificar la hipótesis de partida y el concepto principal.',
        preguntas: [
          '¿Cuál es la tesis central que plantea el autor en este tramo?',
          '¿Cómo se vincula esta definición con el eje de la materia?',
        ],
      },
      {
        id: 2,
        titulo: 'Marco Teórico y Definiciones',
        paginas: 'Páginas 1 a 5',
        foco: 'Identificar la hipótesis de partida y el concepto principal.',
        preguntas: [
          '¿Cuál es la tesis central que plantea el autor en este tramo?',
          '¿Cómo se vincula esta definición con el eje de la materia?',
        ],
      },
      {
        id: 3,
        titulo: 'Desarrollo y Casos de Estudio',
        paginas: 'Páginas 6 a 12',
        foco: 'Prestar atención a los límites metodológicos que señala el texto.',
        preguntas: [
          '¿Qué evidencia o ejemplo utiliza para respaldar su postura?',
          '¿Qué contradicciones señala frente a autores previos?',
        ],
      },
      {
        id: 4,
        titulo: 'Conclusiones y Cierre',
        paginas: 'Páginas 13 a 18',
        foco: 'Sintetizar las ideas para responder preguntas de examen.',
        preguntas: [
          '¿A qué síntesis arriba el autor?',
          'En una frase: ¿cuál es el aporte clave que debés recordar?',
        ],
      },
    ];
  } catch (error) {
    console.error('Error al conectar con la API:', error);
    alert('Hubo un error al obtener los datos de la API.');
    return [];
  }
};

export default function ChatView() {
  const location = useLocation();
  const navigate = useNavigate();

  // Documento recibido desde Home.jsx
  const documentoEntrante = location.state?.document;

  const [pdfUrl, setPdfUrl] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [programa, setPrograma] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  // Estados de sesión: 'setup' | 'loading' | 'reading' | 'chat' | 'summary'
  const [paso, setPaso] = useState('setup');
  const [sidebarAbierta, setSidebarAbierta] = useState(true);

  const [tramos, setTramos] = useState([]);
  const [tramoIdx, setTramoIdx] = useState(0);
  const [apuntes, setApuntes] = useState({});
  const [copiado, setCopiado] = useState(false);

  const fileInputRef = useRef(null);

  // 1. CARGA AUTOMÁTICA SI VIENE DESDE HOME
  useEffect(() => {
    if (documentoEntrante && documentoEntrante.file) {
      setNombreArchivo(documentoEntrante.title || 'Documento sin título');

      let filePath = documentoEntrante.file;
      if (!filePath.startsWith('http')) {
        const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
        filePath = `http://localhost:8000${cleanPath}`;
      }

      // Descargar el archivo y crear un Blob local para el visor (evita X-Frame-Options)
      fetch(filePath)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error ${res.status}: no se encontró en ${filePath}`);
          }
          return res.blob();
        })
        .then((blob) => {
          const file = new File([blob], `${documentoEntrante.title || 'documento'}.pdf`, {
            type: 'application/pdf',
          });
          setPdfFile(file);

          const localBlobUrl = URL.createObjectURL(blob);
          setPdfUrl(localBlobUrl);
        })
        .catch((err) => {
          console.error('Error al cargar el PDF:', err);
          alert(`No se pudo cargar el archivo: ${err.message}`);
        });
    }
  }, [documentoEntrante]);

  // Liberar memoria del Blob al salir
  useEffect(() => {
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleCargarPdf = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      if (pdfUrl && pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(file));
      setNombreArchivo(file.name);
      setPdfFile(file);
    } else {
      alert('Por favor, seleccioná un archivo PDF válido.');
    }
  };

  const handleQuitarPdf = () => {
    if (pdfUrl && pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setNombreArchivo('');
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleIniciarSesion = async (e) => {
    e.preventDefault();
    if (!pdfUrl) {
      alert('Debés cargar un PDF para comenzar.');
      return;
    }

    setPaso('loading');

    try {
      const data = await obtenerPrimerTramoDeApi(programa, pdfFile);

      if (data && data.length > 0) {
        setTramos(data);
        setTramoIdx(0);
        setPaso('reading');
        setSidebarAbierta(true);
      } else {
        setPaso('setup');
      }
    } catch (error) {
      console.error('Error en la sesión:', error);
      alert('No se pudo conectar con el servidor de Django. Verificá que esté encendido.');
      setPaso('setup');
    }
  };

  const tramoActual = tramos[tramoIdx];

  const handleTerminarLectura = () => {
    setPaso('chat');
  };

  const handleCopiarResumen = () => {
    let textoResumen = `RESUMEN DE ESTUDIO - TRAMO\nDocumento: ${nombreArchivo}\nEje: ${programa || 'General'}\n\n`;
    tramos.forEach((t, i) => {
      textoResumen += `--- TRAMO ${i + 1}: ${t.titulo} (${t.paginas}) ---\n`;
      t.preguntas.forEach((p, pIdx) => {
        const r = apuntes[t.id]?.[pIdx] || '(Sin respuesta)';
        textoResumen += `Pregunta: ${p}\nApunte: ${r}\n\n`;
      });
    });
    navigator.clipboard.writeText(textoResumen);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="obsidian-chat-workspace">
      {/* 1. VISOR PRINCIPAL */}
      <main className="obsidian-pdf-panel">
        {/* Barra superior de control */}
        <header className="pdf-control-bar">
          <div className="bar-left-zone">
            <button
              type="button"
              className="btn-back-shelf"
              onClick={() => navigate('/')}
              title="Volver a los cuadernos"
            >
              ← Cuadernos
            </button>
            {nombreArchivo && (
              <span className="doc-pill-indicator" title={nombreArchivo}>
                <span className="dot-active-pulse" />
                {nombreArchivo}
              </span>
            )}
          </div>

          <div className="bar-right-zone">
            {tramoActual && paso !== 'setup' && paso !== 'loading' && (
              <span className="tramo-meta-pill">
                Objetivo: <strong>{tramoActual.paginas}</strong>
              </span>
            )}

            {!sidebarAbierta && (
              <button
                type="button"
                className="btn-reopen-sidebar"
                onClick={() => setSidebarAbierta(true)}
                title="Abrir panel de lectura"
              >
                Panel de estudio →
              </button>
            )}
          </div>
        </header>

        {/* Visor PDF o diálogo vacío */}
        <div className="pdf-render-stage">
          {pdfUrl ? (
            <iframe src={pdfUrl} title="Visor PDF" className="pdf-embedded-frame" />
          ) : (
            <div className="pdf-empty-display">
              <div className="empty-dialog-card">
                <span className="empty-file-icon">📄</span>
                <h2>Sin documento seleccionado</h2>
                <p>Cargá tu PDF en el panel lateral o seleccioná uno desde tus cuadernos.</p>
                <button
                  type="button"
                  className="btn-empty-return"
                  onClick={() => navigate('/')}
                >
                  ← Volver a Cuadernos
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 2. PANEL LATERAL (BARRA DE ESTUDIO) */}
      <aside className={`obsidian-sidebar-panel ${sidebarAbierta ? 'is-open' : 'is-closed'}`}>
        <header className="sidebar-header-bar">
          <div className="sidebar-brand-box" onClick={() => navigate('/')} title="Volver al inicio">
            <span className="brand-dot-indicator" />
            <span className="brand-name">TRAMO</span>
          </div>

          <div className="sidebar-actions-box">
            {paso !== 'setup' && paso !== 'loading' && (
              <span className="tramo-counter-tag">
                {paso === 'summary' ? 'Resumen' : `Tramo ${tramoIdx + 1}/${tramos.length}`}
              </span>
            )}
            <button
              type="button"
              className="btn-close-sidebar"
              onClick={() => setSidebarAbierta(false)}
              title="Ocultar barra lateral"
            >
              ✕
            </button>
          </div>
        </header>

        {/* PASO 1: SETUP */}
        {paso === 'setup' && (
          <div className="sidebar-body-container">
            <form onSubmit={handleIniciarSesion} className="sidebar-setup-form">
              <div className="form-input-group">
                <label className="group-label">Documento PDF:</label>
                <input
                  type="file"
                  id="pdf-upload"
                  ref={fileInputRef}
                  accept="application/pdf"
                  onChange={handleCargarPdf}
                  className="hidden-file-input"
                />

                {!nombreArchivo ? (
                  <label htmlFor="pdf-upload" className="file-select-dropzone">
                    + Seleccionar archivo PDF
                  </label>
                ) : (
                  <div className="file-loaded-pill">
                    <span className="file-loaded-title" title={nombreArchivo}>
                      📄 {nombreArchivo}
                    </span>
                    <button
                      type="button"
                      onClick={handleQuitarPdf}
                      className="btn-remove-selected-file"
                      title="Quitar archivo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="form-input-group">
                <label className="group-label" htmlFor="programa">
                  Eje temático / Programa:
                </label>
                <textarea
                  id="programa"
                  rows="4"
                  placeholder="Pegá temas de examen, unidades o conceptos clave a priorizar..."
                  value={programa}
                  onChange={(e) => setPrograma(e.target.value)}
                  className="obsidian-text-field"
                />
                <span className="group-helper-text">
                  La IA utilizará estos datos para estructurar las pausas y preguntas.
                </span>
              </div>

              <button
                type="submit"
                className="btn-submit-reading"
                disabled={!pdfUrl}
              >
                {pdfUrl ? 'Comenzar recorrido →' : 'Cargá un PDF para comenzar'}
              </button>
            </form>
          </div>
        )}

        {/* ESTADO DE CARGA */}
        {paso === 'loading' && (
          <div className="sidebar-body-container sidebar-status-center">
            <span className="subtle-loading-spinner" />
            <p className="loading-status-text">Analizando el texto y estructurando tramos...</p>
          </div>
        )}

        {/* PASO 2: LECTURA EN CURSO */}
        {paso === 'reading' && tramoActual && (
          <div className="sidebar-body-container">
            <div className="reading-card-module">
              <div className="progress-bar-slot">
                <div
                  className="progress-bar-filled"
                  style={{ width: `${((tramoIdx) / tramos.length) * 100}%` }}
                />
              </div>

              <span className="reading-step-badge">LECTURA ACTIVA</span>
              <h2 className="tramo-heading">{tramoActual.titulo}</h2>

              <div className="target-pill-row">
                📍 Objetivo: {tramoActual.paginas}
              </div>

              <div className="focus-card-surface">
                <span className="focus-title-label">Foco conceptual:</span>
                <p>{tramoActual.foco}</p>
              </div>

              <p className="reading-hint-text">
                Leé en el visor hasta la página indicada. Cuando termines, iniciá la consulta con el asistente.
              </p>

              <button
                type="button"
                onClick={handleTerminarLectura}
                className="btn-submit-reading"
              >
                Terminé este tramo →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: INTERFAZ DE CHAT */}
        {paso === 'chat' && tramoActual && (
          <ChatSidebar
            tramo={tramoActual}
            tramoIdx={tramoIdx}
            totalTramos={tramos.length}
            onGuardarApunte={(tramoId, pregIdx, texto) => {
              setApuntes((prev) => ({
                ...prev,
                [tramoId]: {
                  ...(prev[tramoId] || {}),
                  [pregIdx]: texto,
                },
              }));
            }}
            onAvanzar={() => {
              if (tramoIdx + 1 < tramos.length) {
                setTramoIdx((prev) => prev + 1);
                setPaso('reading');
              } else {
                setPaso('summary');
              }
            }}
          />
        )}

        {/* PASO 4: RESUMEN FINAL */}
        {paso === 'summary' && (
          <div className="sidebar-body-container">
            <div className="summary-card-module">
              <div className="summary-header-box">
                <h3 className="summary-title-text">Notas de la sesión</h3>
                <button
                  type="button"
                  onClick={handleCopiarResumen}
                  className="btn-copy-action"
                >
                  {copiado ? '✓ Copiado' : 'Copiar todo'}
                </button>
              </div>

              <div className="summary-scrollable-zone">
                {tramos.map((t, i) => (
                  <div key={t.id} className="summary-block-card">
                    <h4 className="summary-block-heading">
                      {i + 1}. {t.titulo} <small>({t.paginas})</small>
                    </h4>
                    {t.preguntas.map((p, pIdx) => (
                      <div key={pIdx} className="qa-pair-box">
                        <span className="qa-label-q">{p}</span>
                        <p className="qa-paragraph-a">{apuntes[t.id]?.[pIdx] || 'Sin notas.'}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setPaso('setup');
                  setTramos([]);
                  setApuntes({});
                  handleQuitarPdf();
                }}
                className="btn-restart-action"
              >
                Iniciar nueva sesión
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}