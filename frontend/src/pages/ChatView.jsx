import React, { useState, useEffect, useRef } from 'react';
import './ChatView.css';
import ChatSidebar from '../components/ChatSidebar';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { TrashIcon, ChevronLeftIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

// Función para conectar con la API de Django
// Función para iniciar la sesión y obtener los tramos desde el backend
const iniciarSesionEnBackend = async (documentId, programa, token) => {
  if (!documentId) {
    alert('No se detectó el ID del documento. Por favor volvé a la pantalla de Cuadernos y abrí el documento.');
    return [];
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    const response = await fetch(`http://localhost:8000/chat/documents/${documentId}/start-session/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ programa }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Servidor respondió con código ${response.status}: ${errorMsg}`);
    }

    // The backend directly returns the list of tramos!
    const tramosData = await response.json();
    return tramosData;
  } catch (error) {
    console.error('Error al conectar con la API:', error);
    alert(error.message);
    return [];
  }
};

export default function ChatView() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Documento y cuaderno recibidos desde Home.jsx
  const documentoEntrante = location.state?.document;
  const cuadernoEntrante = location.state?.notebook;
  const notebookId = location.state?.notebookId || documentoEntrante?.notebook || cuadernoEntrante?.id;

  const [documentoActual, setDocumentoActual] = useState(documentoEntrante || null);
  const [cuadernoActual, setCuadernoActual] = useState(cuadernoEntrante || null);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [programa, setPrograma] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  // Verificar si el documento ya cuenta con tramos procesados
  const tramosIniciales =
    documentoEntrante?.tramos && Array.isArray(documentoEntrante.tramos) && documentoEntrante.tramos.length > 0
      ? documentoEntrante.tramos
      : [];
  const tieneTramosIniciales = tramosIniciales.length > 0;

  // Estados de sesión: 'setup' | 'loading' | 'reading' | 'chat' | 'summary'
  const [paso, setPaso] = useState(tieneTramosIniciales ? 'reading' : 'setup');
  const [sidebarAbierta, setSidebarAbierta] = useState(true);

  const [tramos, setTramos] = useState(tramosIniciales);
  const [tramoIdx, setTramoIdx] = useState(0);
  const [apuntes, setApuntes] = useState({});
  const [copiado, setCopiado] = useState(false);

  // Estados para modal in-app de confirmación de eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [eliminandoDoc, setEliminandoDoc] = useState(false);

  const fileInputRef = useRef(null);

  // 1. CARGA AUTOMÁTICA SI VIENE DESDE HOME
  useEffect(() => {
    if (documentoEntrante) {
      // Si el documento ya tiene tramos listos, saltar directamente a 'reading' (Lectura Activa)
      if (Array.isArray(documentoEntrante.tramos) && documentoEntrante.tramos.length > 0) {
        setTramos(documentoEntrante.tramos);
        setTramoIdx(0);
        setPaso('reading');
      } else if (documentoEntrante.id) {
        // En caso de que no vinieran en location.state, consultar al backend si ya están listos
        const headers = {};
        if (token) headers['Authorization'] = `Token ${token}`;

        fetch(`http://localhost:8000/chat/documents/${documentoEntrante.id}/`, { headers })
          .then((res) => (res.ok ? res.json() : null))
          .then((docData) => {
            if (docData && Array.isArray(docData.tramos) && docData.tramos.length > 0) {
              setTramos(docData.tramos);
              setTramoIdx(0);
              setPaso('reading');
            }
          })
          .catch((err) => console.error('Error al consultar tramos del documento:', err));
      }

      if (documentoEntrante.file) {
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
      // Pass the document ID, study topics text, and auth token:
      const docId = documentoActual?.id || documentoEntrante?.id;
      const data = await iniciarSesionEnBackend(docId, programa, token);
      if (data && data.length > 0) {
        setTramos(data);            // <-- Receives the array of tramos from Django!
        setTramoIdx(0);             // <-- Starts at Tramo 1 (index 0)
        setPaso('reading');         // <-- Transitions directly to the reading view
        setSidebarAbierta(true);

        const docActualizado = {
          ...(documentoActual || documentoEntrante),
          status: 'COMPLETED',
          tramos: data,
        };
        setDocumentoActual(docActualizado);

        const currentNotebook = cuadernoActual || cuadernoEntrante;
        if (currentNotebook) {
          const cuadernoActualizado = {
            ...currentNotebook,
            documents: (currentNotebook.documents || []).map((d) =>
              d.id === docActualizado.id ? docActualizado : d
            ),
          };
          setCuadernoActual(cuadernoActualizado);
        }
      } else {
        setPaso('setup');
      }
    } catch (error) {
      console.error('Error en la sesión:', error);
      alert('No se pudo conectar con el servidor.');
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

  const handleVolverACuaderno = () => {
    const targetNotebook = cuadernoActual || cuadernoEntrante;
    const currentDoc = documentoActual || documentoEntrante;

    const updatedNotebook = targetNotebook
      ? {
          ...targetNotebook,
          documents: (targetNotebook.documents || []).map((d) =>
            d.id === currentDoc?.id
              ? {
                  ...d,
                  status: (tramos && tramos.length > 0) ? 'COMPLETED' : d.status,
                  tramos: (tramos && tramos.length > 0) ? tramos : d.tramos,
                }
              : d
          ),
        }
      : null;

    if (notebookId || targetNotebook) {
      navigate('/', {
        state: {
          notebookId: notebookId || targetNotebook?.id,
          notebook: updatedNotebook,
        },
      });
    } else {
      navigate('/');
    }
  };

  const ejecutarEliminarDocumento = async () => {
    const docId = documentoActual?.id || documentoEntrante?.id;
    if (!docId) return;

    try {
      setEliminandoDoc(true);
      const headers = {};
      if (token) headers['Authorization'] = `Token ${token}`;

      const res = await fetch(`http://localhost:8000/chat/documents/${docId}/`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok && res.status !== 204) {
        throw new Error('Error al eliminar el documento.');
      }

      setModalEliminarAbierto(false);

      const targetNotebook = cuadernoActual || cuadernoEntrante;
      const updatedNotebook = targetNotebook
        ? {
            ...targetNotebook,
            documents: (targetNotebook.documents || []).filter((d) => d.id !== docId),
          }
        : null;

      navigate('/', {
        state: {
          notebookId: notebookId || targetNotebook?.id,
          notebook: updatedNotebook,
        },
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setEliminandoDoc(false);
    }
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
              onClick={handleVolverACuaderno}
              title={cuadernoActual?.name || cuadernoEntrante?.name ? `Volver a ${cuadernoActual?.name || cuadernoEntrante?.name}` : "Volver a Cuadernos"}
            >
              <ChevronLeftIcon size={14} className="btn-return-chevron" />
              <span className="btn-back-shelf-label">
                {cuadernoActual?.name || cuadernoEntrante?.name || 'Cuadernos'}
              </span>
            </button>
            {nombreArchivo && (
              <span className="doc-pill-indicator" title={nombreArchivo}>
                <span className="dot-active-pulse" />
                {nombreArchivo}
              </span>
            )}
            {(documentoActual?.id || documentoEntrante?.id) && (
              <button
                type="button"
                className="btn-delete-document-top"
                onClick={() => setModalEliminarAbierto(true)}
                title="Eliminar este documento"
                aria-label="Eliminar este documento"
              >
                <TrashIcon size={13} />
                <span>Eliminar</span>
              </button>
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
                  onClick={handleVolverACuaderno}
                >
                  <ChevronLeftIcon size={14} className="btn-return-chevron" />
                  <span>{cuadernoEntrante?.name ? `Volver a ${cuadernoEntrante.name}` : "Volver a Cuadernos"}</span>
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

      {/* MODAL IN-APP DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmModal
        isOpen={modalEliminarAbierto}
        title="¿Eliminar documento?"
        message={`¿Estás seguro de que querés eliminar el documento "${nombreArchivo || 'actual'}"? Esta acción no se puede deshacer.`}
        loading={eliminandoDoc}
        onClose={() => setModalEliminarAbierto(false)}
        onConfirm={ejecutarEliminarDocumento}
      />
    </div>
  );
}