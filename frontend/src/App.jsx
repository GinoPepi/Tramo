import React, { useState, useEffect, useRef } from 'react';
import './App.css';
//import { API_BASE_URL } from './services/api';
import ChatSidebar from './components/ChatSidebar';

// Mock de procesamiento con IA
const mockGenerarTramos = async (programa) => {
  await new Promise((res) => setTimeout(res, 1000));
  return [
    {
      id: 1,
      titulo: 'Marco Teórico y Definiciones',
      paginas: 'Páginas 1 a 5',
      foco: 'Identificar la hipótesis de partida y el concepto principal.',
      preguntas: [
        '¿Cuál es la tesis central que plantea el autor en este tramo?',
        '¿Cómo se vincula esta definición con el eje de la materia?'
      ]
    },
    {
      id: 2,
      titulo: 'Desarrollo y Casos de Estudio',
      paginas: 'Páginas 6 a 12',
      foco: 'Prestar atención a los límites metodológicos que señala el texto.',
      preguntas: [
        '¿Qué evidencia o ejemplo utiliza para respaldar su postura?',
        '¿Qué contradicciones señala frente a autores previos?'
      ]
    },
    {
      id: 3,
      titulo: 'Conclusiones y Cierre',
      paginas: 'Páginas 13 a 18',
      foco: 'Sintetizar las ideas para responder preguntas de examen.',
      preguntas: [
        '¿A qué síntesis arriba el autor?',
        'En una frase: ¿cuál es el aporte clave que debés recordar?'
      ]
    }
  ];
};

export default function App() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [programa, setPrograma] = useState('');
  
  // Estados de la sesión: 'setup' | 'loading' | 'reading' | 'chat' | 'summary'
  const [paso, setPaso] = useState('setup');
  const [sidebarAbierta, setSidebarAbierta] = useState(true);

  const [tramos, setTramos] = useState([]);
  const [tramoIdx, setTramoIdx] = useState(0);
  const [apuntes, setApuntes] = useState({});
  const [copiado, setCopiado] = useState(false);

  const fileInputRef = useRef(null);

  // Liberar memoria del ObjectURL al desmontar
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleCargarPdf = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(file));
      setNombreArchivo(file.name);
    } else {
      alert('Por favor, seleccioná un archivo PDF válido.');
    }
  };

  const handleQuitarPdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setNombreArchivo('');
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
    const data = await mockGenerarTramos(programa);
    setTramos(data);
    setTramoIdx(0);
    setPaso('reading');
    setSidebarAbierta(true);
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
    <div className="app-workspace">
      {/* 1. VISOR PRINCIPAL */}
      <main className="pdf-viewport">
        {!sidebarAbierta && (
          <button
            type="button"
            className="btn-reabrir-flotante"
            onClick={() => setSidebarAbierta(true)}
            title="Abrir asistente de lectura"
          >
            <span className="dot-pulse"></span>
            <span>Abrir Asistente</span>
            <span className="arrow-icon">←</span>
          </button>
        )}

        {pdfUrl && (
          <div className="pdf-status-bar">
            <span className="pdf-doc-badge">📄 {nombreArchivo}</span>
            {tramoActual && paso !== 'setup' && (
              <span className="pdf-tramo-indicator">
                Objetivo: <strong>{tramoActual.paginas}</strong>
              </span>
            )}
          </div>
        )}

        {pdfUrl ? (
          <div className="pdf-frame-wrapper">
            <iframe src={pdfUrl} title="Visor PDF" className="pdf-frame" />
          </div>
        ) : (
          <div className="empty-viewport">
            <div className="empty-dialog">
              <span className="logo-dot-large"></span>
              <h2>Área de lectura</h2>
              <p>Cargá tu PDF en la barra lateral para comenzar la sesión guiada.</p>
            </div>
          </div>
        )}
      </main>

      {/* 2. BARRA LATERAL */}
      <aside className={`sidebar ${sidebarAbierta ? 'open' : 'closed'}`}>
        <header className="sidebar-header">
          <div className="brand">
            <span className="logo-dot"></span>
            <h2>Tramo</h2>
          </div>
          
          <div className="sidebar-header-actions">
            {paso !== 'setup' && paso !== 'loading' && (
              <span className="badge">
                {paso === 'summary' ? 'Resumen' : `Tramo ${tramoIdx + 1}/${tramos.length}`}
              </span>
            )}
            <button
              type="button"
              className="btn-cerrar-sidebar"
              onClick={() => setSidebarAbierta(false)}
              title="Ocultar asistente para leer a pantalla completa"
            >
              ✕
            </button>
          </div>
        </header>

        {/* PASO 1: SETUP */}
        {paso === 'setup' && (
          <div className="sidebar-content">
            <form onSubmit={handleIniciarSesion} className="sidebar-form">
              <div className="form-group">
                <label>1. Cargar archivo PDF:</label>
                <input
                  type="file"
                  id="pdf-upload"
                  ref={fileInputRef}
                  accept="application/pdf"
                  onChange={handleCargarPdf}
                  className="file-input"
                />

                {!nombreArchivo ? (
                  <label htmlFor="pdf-upload" className="file-dropzone">
                    📁 Seleccionar archivo PDF
                  </label>
                ) : (
                  <div className="file-selected-box">
                    <span className="file-selected-name" title={nombreArchivo}>
                      📄 {nombreArchivo}
                    </span>
                    <button
                      type="button"
                      onClick={handleQuitarPdf}
                      className="btn-quitar-pdf"
                      title="Quitar archivo cargado"
                    >
                      ✕ Quitar
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="programa">2. Eje o programa de la materia:</label>
                <textarea
                  id="programa"
                  rows="4"
                  placeholder="Pegá aquí el tema del examen, unidad o conceptos clave a priorizar..."
                  value={programa}
                  onChange={(e) => setPrograma(e.target.value)}
                />
                <small>La IA usará esto para recortar y hacerte preguntas pertinentes.</small>
              </div>

              <button
                type="submit"
                className="btn-primary btn-ejecutar"
                disabled={!pdfUrl}
              >
                {pdfUrl ? '🚀 Comenzar recorrido' : 'Subí un PDF para comenzar'}
              </button>
            </form>
          </div>
        )}

        {/* ESTADO DE CARGA */}
        {paso === 'loading' && (
          <div className="sidebar-content sidebar-loading">
            <div className="spinner"></div>
            <p>Analizando el documento y estructurando tramos...</p>
          </div>
        )}

        {/* PASO 2: LECTURA EN CURSO */}
        {paso === 'reading' && tramoActual && (
          <div className="sidebar-content">
            <div className="sidebar-step">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${((tramoIdx) / tramos.length) * 100}%` }}
                ></div>
              </div>

              <div className="step-badge">Lectura activa</div>
              <h3>{tramoActual.titulo}</h3>
              <div className="page-target">📍 Leé hasta: {tramoActual.paginas}</div>

              <div className="focus-card">
                <strong>Foco conceptual:</strong>
                <p>{tramoActual.foco}</p>
              </div>

              <p className="hint">
                Usá el visor para leer tranquilo. Cuando llegues a la página indicada, hacé una pausa acá para charlar con la IA.
              </p>

              <button
                type="button"
                onClick={handleTerminarLectura}
                className="btn-primary btn-ejecutar"
              >
                Terminé de leer este tramo →
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: INTERFAZ DE CHAT (Componente externo) */}
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
                  [pregIdx]: texto
                }
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
          <div className="sidebar-content">
            <div className="sidebar-step">
              <div className="summary-top">
                <h3>Notas completas</h3>
                <button type="button" onClick={handleCopiarResumen} className="btn-secondary">
                  {copiado ? '✓ Copiado' : 'Copiar todo'}
                </button>
              </div>

              <div className="summary-scroll">
                {tramos.map((t, i) => (
                  <div key={t.id} className="summary-block">
                    <h4>{i + 1}. {t.titulo} <small>({t.paginas})</small></h4>
                    {t.preguntas.map((p, pIdx) => (
                      <div key={pIdx} className="summary-note">
                        <span className="note-q">{p}</span>
                        <p className="note-a">{apuntes[t.id]?.[pIdx] || 'Sin notas.'}</p>
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
                className="btn-text"
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