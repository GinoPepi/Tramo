import React, { useState, useEffect, useRef } from 'react';
import './ChatView.css';
import ChatSidebar from '../components/ChatSidebar';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { TrashIcon, ChevronLeftIcon, ChevronDownIcon, FileTextIcon, AlertTriangleIcon, RotateCcwIcon } from '../components/Icons';

// Helper para obtener token JWT de autenticación
const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('tramo_access');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
};

// Función para conectar con la API de Django
// Función para iniciar la sesión y obtener los tramos desde el backend
const iniciarSesionEnBackend = async (documentId, overviewText, overviewFile, docTitle) => {
  if (!documentId) {
    alert('No se detectó el ID del documento. Por favor volvé a la pantalla de Cuadernos y abrí el documento.');
    return [];
  }

  try {
    // 1. Guardar title, syllabus_text y/o syllabus_file en el documento con método PATCH
    if (docTitle || overviewText || overviewFile) {
      const formData = new FormData();
      if (docTitle) {
        formData.append('title', docTitle);
      }
      if (overviewText) {
        formData.append('syllabus_text', overviewText);
      }
      if (overviewFile) {
        formData.append('syllabus_file', overviewFile);
      }

      const patchRes = await fetch(`http://localhost:8000/chat/documents/${documentId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!patchRes.ok) {
        const patchErr = await patchRes.text();
        console.error('Error al guardar datos del documento:', patchErr);
      }
    }

    // 2. Iniciar sesión en el backend (el backend lee el overview directamente del documento)
    const response = await fetch(`http://localhost:8000/chat/documents/${documentId}/start-session/`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({}),
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

// Función para enviar una respuesta individual al backend (guarda en temp_answers)
const enviarRespuestaAlBackend = async (documentId, tramoId, preguntaIdx, respuesta) => {
  if (!documentId) return null;
  try {
    const response = await fetch(`http://localhost:8000/chat/documents/${documentId}/submit-answer/`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        tramo_id: tramoId,
        pregunta_idx: preguntaIdx,
        respuesta,
      }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`Error del servidor al guardar respuesta: ${errorMsg}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error al conectar con la API para guardar respuesta:', error);
    return null;
  }
};

// Función para finalizar la sesión ('overwrite' o 'discard')
const finalizarSesionEnBackend = async (documentId, action) => {
  if (!documentId) return null;
  try {
    const response = await fetch(`http://localhost:8000/chat/documents/${documentId}/finish-session/`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      console.error(`Error del servidor al finalizar sesión: ${errorMsg}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error al conectar con la API para finalizar sesión:', error);
    return null;
  }
};

// Convierte respuestas del backend ({"t1_q0": { tramo_id, pregunta_idx, respuesta }}) al formato local de apuntes ({ [tramoId]: { [pregIdx]: respuesta } })
const formatearApuntesDesdeBackend = (respuestasObj) => {
  if (!respuestasObj || typeof respuestasObj !== 'object') return {};
  const formateados = {};
  Object.values(respuestasObj).forEach((item) => {
    if (item && item.tramo_id !== undefined && item.pregunta_idx !== undefined) {
      if (!formateados[item.tramo_id]) {
        formateados[item.tramo_id] = {};
      }
      formateados[item.tramo_id][item.pregunta_idx] = item.respuesta || '';
    }
  });
  return formateados;
};

// Calcula en qué tramo y en qué paso debe iniciar el usuario según las respuestas guardadas
const calcularProgreso = (tramosList, respuestasObj) => {
  if (!Array.isArray(tramosList) || tramosList.length === 0) {
    return { tramoIdx: 0, paso: 'setup' };
  }

  const respuestas = respuestasObj || {};

  for (let i = 0; i < tramosList.length; i++) {
    const t = tramosList[i];
    const preguntas = Array.isArray(t.preguntas) ? t.preguntas : [];

    let preguntasRespondidas = 0;
    for (let pIdx = 0; pIdx < preguntas.length; pIdx++) {
      const key = `t${t.id}_q${pIdx}`;
      if (respuestas[key]?.respuesta || (typeof respuestas[key] === 'string' && respuestas[key])) {
        preguntasRespondidas++;
      }
    }

    // Si este tramo tiene preguntas incompletas:
    if (preguntasRespondidas < preguntas.length) {
      if (preguntasRespondidas > 0) {
        // En el medio de las preguntas de este tramo: entra directo al chat
        return { tramoIdx: i, paso: 'chat' };
      } else {
        // No empezó las preguntas de este tramo: arranca en lectura
        return { tramoIdx: i, paso: 'reading' };
      }
    }
  }

  // Todos los tramos completados: va directo al resumen
  return { tramoIdx: tramosList.length - 1, paso: 'summary' };
};

// Verifica si todos los tramos tienen sus preguntas respondidas (en answers o temp_answers)
const verificarSiTieneResumen = (tramosList, respuestasObj) => {
  if (!Array.isArray(tramosList) || tramosList.length === 0) return false;
  const respuestas = respuestasObj || {};
  return tramosList.every((t) => {
    const preguntas = Array.isArray(t.preguntas) ? t.preguntas : [];
    if (preguntas.length === 0) return true;
    return preguntas.every((_, pIdx) => {
      const key = `t${t.id}_q${pIdx}`;
      return !!(respuestas[key]?.respuesta || (typeof respuestas[key] === 'string' && respuestas[key]));
    });
  });
};

export default function ChatView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId: paramDocId, notebookId: paramNotebookId } = useParams();

  // Documento y cuaderno recibidos desde Home.jsx o desde la URL directa
  const documentoEntrante = location.state?.document;
  const cuadernoEntrante = location.state?.notebook;
  const targetDocId = paramDocId || documentoEntrante?.id;
  const notebookId = location.state?.notebookId || documentoEntrante?.notebook || cuadernoEntrante?.id || paramNotebookId;

  // Helper para obtener el nombre base del archivo subido (sin extensión)
  const extraerNombreBase = (doc, fallback = '') => {
    if (doc?.file) {
      const fileName = String(doc.file).split('/').pop().split('?')[0];
      return fileName.replace(/\.[^/.]+$/, '');
    }
    return fallback;
  };

  const baseInicial = extraerNombreBase(documentoEntrante, documentoEntrante?.title || '');
  const tituloInicial = documentoEntrante?.title || baseInicial || '';

  const [documentoActual, setDocumentoActual] = useState(documentoEntrante || null);
  const [cuadernoActual, setCuadernoActual] = useState(cuadernoEntrante || null);

  const [pdfUrl, setPdfUrl] = useState(null);
  const [nombreOriginalArchivo, setNombreOriginalArchivo] = useState(baseInicial);
  const [tituloDocumento, setTituloDocumento] = useState(tituloInicial);
  const [nombreArchivo, setNombreArchivo] = useState(tituloInicial);
  const [programa, setPrograma] = useState(() => documentoEntrante?.syllabus_text || '');
  const [overviewFile, setOverviewFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const tituloTextareaRef = useRef(null);

  // Verificar si el documento ya cuenta con tramos procesados
  const tramosIniciales =
    documentoEntrante?.tramos && Array.isArray(documentoEntrante.tramos) && documentoEntrante.tramos.length > 0
      ? documentoEntrante.tramos
      : [];
  const tieneTramosIniciales = tramosIniciales.length > 0;

  const respuestasIniciales = {
    ...(documentoEntrante?.answers || {}),
    ...(documentoEntrante?.temp_answers || {}),
  };

  const progresoInicial = calcularProgreso(tramosIniciales, respuestasIniciales);

  // Estados de sesión: 'setup' | 'loading' | 'reading' | 'chat' | 'summary'
  const [paso, setPaso] = useState(tieneTramosIniciales ? progresoInicial.paso : 'setup');
  const [sidebarAbierta, setSidebarAbierta] = useState(true);

  const [tramos, setTramos] = useState(tramosIniciales);
  const [tramoIdx, setTramoIdx] = useState(tieneTramosIniciales ? progresoInicial.tramoIdx : 0);

  const [apuntes, setApuntes] = useState(() => formatearApuntesDesdeBackend(respuestasIniciales));
  const [copiado, setCopiado] = useState(false);
  const [guardandoSesion, setGuardandoSesion] = useState(false);
  const [estadoSesionTexto, setEstadoSesionTexto] = useState('');
  const [editandoDesdeResumen, setEditandoDesdeResumen] = useState(false);

  const currentDoc = documentoActual || documentoEntrante;
  const currentNotebook = cuadernoActual || cuadernoEntrante;
  const nombreCuaderno = currentNotebook?.name || 'Cuaderno';
  const documentosCuaderno = currentNotebook?.documents || [];

  const respuestasCombinadas = {
    ...(currentDoc?.answers || {}),
    ...(currentDoc?.temp_answers || {}),
  };

  const consolidandoRef = useRef(false);

  // Consolidar automáticamente temp_answers a answers si el usuario llega al resumen por primera vez
  const consolidarPrimeraSesionSiAplica = async (docObj = documentoActual || documentoEntrante) => {
    const docId = docObj?.id;
    if (!docId || consolidandoRef.current) return;

    const answersExistentes = docObj?.answers && Object.keys(docObj.answers).length > 0;
    const tempAnswersExistentes = docObj?.temp_answers && Object.keys(docObj.temp_answers).length > 0;

    // Solo se consolida automáticamente si es la PRIMERA VEZ (no hay answers previas y sí hay respuestas temporales)
    if (!answersExistentes && tempAnswersExistentes) {
      try {
        consolidandoRef.current = true;
        const res = await finalizarSesionEnBackend(docId, 'overwrite');
        if (res?.status === 'overwritten') {
          setDocumentoActual((prev) => ({
            ...(prev || {}),
            answers: res.answers,
            temp_answers: {},
          }));
          if (res.answers) {
            setApuntes(formatearApuntesDesdeBackend(res.answers));
          }
          setEstadoSesionTexto('✓ ¡Tus notas fueron guardadas exitosamente!');
        }
      } catch (err) {
        console.error('Error al consolidar primera sesión:', err);
      } finally {
        consolidandoRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (paso === 'summary') {
      consolidarPrimeraSesionSiAplica();
    }
  }, [paso, documentoActual]);

  const ajustarAlturaTextarea = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 84)}px`;
  };

  useEffect(() => {
    if (tituloTextareaRef.current) {
      ajustarAlturaTextarea(tituloTextareaRef.current);
    }
  }, [tituloDocumento, paso, pdfUrl]);

  const persistirTitulo = async (nuevoTitulo) => {
    const docId = documentoActual?.id || documentoEntrante?.id;
    if (!docId || !nuevoTitulo) return;

    try {
      const formData = new FormData();
      formData.append('title', nuevoTitulo);
      const res = await fetch(`http://localhost:8000/chat/documents/${docId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (res.ok) {
        const docData = await res.json();
        setDocumentoActual((prev) => ({
          ...(prev || {}),
          title: docData.title || nuevoTitulo,
        }));
        const targetNotebook = cuadernoActual || cuadernoEntrante;
        if (targetNotebook) {
          const docsActualizados = (targetNotebook.documents || []).map((d) =>
            d.id === docId ? { ...d, title: docData.title || nuevoTitulo } : d
          );
          setCuadernoActual((prev) => ({
            ...(prev || targetNotebook),
            documents: docsActualizados,
          }));
        }
      }
    } catch (err) {
      console.error('Error al persistir el título del documento:', err);
    }
  };

  const handleTituloChange = (e) => {
    const rawVal = e.target.value;
    const limpio = rawVal.replace(/[\r\n]+/g, ' ');
    setTituloDocumento(limpio);
    setNombreArchivo(limpio.trim() || nombreOriginalArchivo);
    ajustarAlturaTextarea(e.target);
  };

  const handleTituloKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  };

  const handleTituloBlur = () => {
    const tituloFinal = tituloDocumento.trim() || nombreOriginalArchivo;
    setTituloDocumento(tituloFinal);
    setNombreArchivo(tituloFinal);
    persistirTitulo(tituloFinal);
  };

  useEffect(() => {
    if (notebookId) {
      fetch(`http://localhost:8000/chat/notebooks/${notebookId}/`, {
        headers: getAuthHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setCuadernoActual(data);
        })
        .catch((err) => console.error('Error al cargar cuaderno:', err));
    }
  }, [notebookId]);

  const cargarDocumento = (doc) => {
    if (!doc || doc.id === currentDoc?.id) return;

    if (pdfUrl && pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    setPdfFile(null);
    setNombreArchivo('');

    setDocumentoActual(doc);

    const base = extraerNombreBase(doc, doc.title || '');
    const tit = doc.title || base || 'Documento sin título';
    setNombreArchivo(tit);
    setTituloDocumento(tit);
    setNombreOriginalArchivo(base || tit);

    if (doc.file) {
      let filePath = doc.file;
      if (!filePath.startsWith('http')) {
        const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
        filePath = `http://localhost:8000${cleanPath}`;
      }

      fetch(filePath)
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}: no se encontró en ${filePath}`);
          return res.blob();
        })
        .then((blob) => {
          const file = new File([blob], `${doc.title || 'documento'}.pdf`, {
            type: 'application/pdf',
          });
          setPdfFile(file);
          const localBlobUrl = URL.createObjectURL(blob);
          setPdfUrl(localBlobUrl);
        })
        .catch((err) => {
          console.error('Error al cargar el PDF:', err);
        });
    }

    setPrograma(doc.syllabus_text || currentNotebook?.syllabus_text || '');
    setOverviewFile(null);

    const tramosDoc = Array.isArray(doc.tramos) && doc.tramos.length > 0 ? doc.tramos : [];
    setTramos(tramosDoc);

    const respuestasDoc = {
      ...(doc.answers || {}),
      ...(doc.temp_answers || {}),
    };

    setApuntes(formatearApuntesDesdeBackend(respuestasDoc));

    if (tramosDoc.length > 0) {
      const { tramoIdx: idx, paso: p } = calcularProgreso(tramosDoc, respuestasDoc);
      setTramoIdx(idx);
      setPaso(p);
    } else {
      setPaso('setup');
      setTramoIdx(0);
    }

    setEditandoDesdeResumen(false);
    setEstadoSesionTexto('');

    if (doc.id) {
      fetch(`http://localhost:8000/chat/documents/${doc.id}/`, {
        headers: getAuthHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((docData) => {
          if (docData) {
            setDocumentoActual(docData);
            if (docData.title) {
              setNombreArchivo(docData.title);
              setTituloDocumento(docData.title);
            }
            const respuestasFuente = {
              ...(docData.answers || {}),
              ...(docData.temp_answers || {}),
            };
            if (docData.syllabus_text) {
              setPrograma(docData.syllabus_text);
            }
            if (Array.isArray(docData.tramos) && docData.tramos.length > 0) {
              setTramos(docData.tramos);
              const { tramoIdx: idx, paso: p } = calcularProgreso(docData.tramos, respuestasFuente);
              setTramoIdx(idx);
              setPaso(p);
            }
            if (Object.keys(respuestasFuente).length > 0) {
              setApuntes(formatearApuntesDesdeBackend(respuestasFuente));
            }
          }
        })
        .catch((err) => console.error('Error al consultar tramos del documento:', err));
    }

    navigate(`/document/${doc.id}`, {
      replace: true,
      state: {
        document: doc,
        notebook: currentNotebook,
        notebookId: notebookId || currentNotebook?.id,
      },
    });
  };

  const puedeVerResumen =
    tramos.length > 0 &&
    (verificarSiTieneResumen(tramos, respuestasCombinadas) ||
      (currentDoc?.answers && Object.keys(currentDoc.answers).length > 0));

  // Estados para modal in-app de confirmación de eliminación
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [eliminandoDoc, setEliminandoDoc] = useState(false);

  const fileInputRef = useRef(null);
  const overviewFileInputRef = useRef(null);

  // 1. CARGA AUTOMÁTICA SI VIENE DESDE HOME O POR URL DIRECTA
  useEffect(() => {
    const docId = targetDocId;
    if (!docId) return;

    // Si el documento ya tiene tramos listos localmente, calcular progreso inicial
    if (documentoEntrante?.tramos && Array.isArray(documentoEntrante.tramos) && documentoEntrante.tramos.length > 0) {
      setTramos(documentoEntrante.tramos);
      const { tramoIdx: idx, paso: p } = calcularProgreso(documentoEntrante.tramos, respuestasIniciales);
      setTramoIdx(idx);
      setPaso(p);
    }

    // Función auxiliar para cargar el blob del PDF en memoria
    const descargarBlobPdf = (archivoUrl, titulo) => {
      let filePath = archivoUrl;
      if (!filePath.startsWith('http')) {
        const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
        filePath = `http://localhost:8000${cleanPath}`;
      }

      fetch(filePath)
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}: no se encontró en ${filePath}`);
          return res.blob();
        })
        .then((blob) => {
          const file = new File([blob], `${titulo || 'documento'}.pdf`, {
            type: 'application/pdf',
          });
          setPdfFile(file);
          const localBlobUrl = URL.createObjectURL(blob);
          setPdfUrl(localBlobUrl);
        })
        .catch((err) => {
          console.error('Error al cargar el PDF:', err);
        });
    };

    if (documentoEntrante?.file && !pdfUrl) {
      descargarBlobPdf(documentoEntrante.file, documentoEntrante.title);
    }

    // Sincronizar siempre con el backend para tener la versión más fresca de la base de datos
    fetch(`http://localhost:8000/chat/documents/${docId}/`, {
      headers: getAuthHeaders(),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((docData) => {
        if (docData) {
          setDocumentoActual(docData);
          const base = extraerNombreBase(docData, docData.title || '');
          const tit = docData.title || base || 'Documento sin título';
          setNombreArchivo(tit);
          setTituloDocumento(tit);
          setNombreOriginalArchivo(base || tit);

          const respuestasFuente = {
            ...(docData.answers || {}),
            ...(docData.temp_answers || {}),
          };

          if (docData.syllabus_text) {
            setPrograma(docData.syllabus_text);
          }

          if (Array.isArray(docData.tramos) && docData.tramos.length > 0) {
            setTramos(docData.tramos);
            const { tramoIdx: idx, paso: p } = calcularProgreso(docData.tramos, respuestasFuente);
            setTramoIdx(idx);
            setPaso(p);
          }

          if (Object.keys(respuestasFuente).length > 0) {
            setApuntes(formatearApuntesDesdeBackend(respuestasFuente));
          }

          if (docData.file && !pdfUrl) {
            descargarBlobPdf(docData.file, docData.title);
          }

          // Si vino por URL directa y aún no tenemos el cuaderno cargado
          if (docData.notebook && !cuadernoActual) {
            fetch(`http://localhost:8000/chat/notebooks/${docData.notebook}/`, {
              headers: getAuthHeaders(),
            })
              .then((res) => (res.ok ? res.json() : null))
              .then((nbData) => {
                if (nbData) setCuadernoActual(nbData);
              })
              .catch((err) => console.error('Error al cargar cuaderno:', err));
          }
        }
      })
      .catch((err) => console.error('Error al consultar datos del documento:', err));
  }, [targetDocId]);

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
      const cleanStem = file.name.replace(/\.[^/.]+$/, '');
      setNombreOriginalArchivo(cleanStem);
      setTituloDocumento(cleanStem);
      setNombreArchivo(cleanStem);
      setPdfFile(file);
    } else {
      alert('Por favor, seleccioná un archivo PDF válido.');
    }
  };

  const handleQuitarPdf = () => {
    if (pdfUrl && pdfUrl.startsWith('blob:')) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setNombreArchivo('');
    setTituloDocumento('');
    setNombreOriginalArchivo('');
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
    const finalTitle = tituloDocumento.trim() || nombreOriginalArchivo;
    setPaso('loading');
    try {
      // Pass the document ID, overview text, overview file and final title:
      const docId = documentoActual?.id || documentoEntrante?.id;
      const data = await iniciarSesionEnBackend(docId, programa, overviewFile, finalTitle);
      if (data && data.length > 0) {
        setTramos(data);            // <-- Receives the array of tramos from Django!
        setTramoIdx(0);             // <-- Starts at Tramo 1 (index 0)
        setPaso('reading');         // <-- Transitions directly to the reading view
        setSidebarAbierta(true);

        const docActualizado = {
          ...(documentoActual || documentoEntrante),
          title: finalTitle,
          status: 'COMPLETED',
          tramos: data,
          syllabus_text: programa,
          ...(overviewFile ? { syllabus_file: overviewFile.name } : {}),
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

  const handleTramoAnterior = () => {
    if (tramoIdx <= 0) return;
    const prevIdx = tramoIdx - 1;
    setTramoIdx(prevIdx);
    setPaso('reading');
  };

  const handleCopiarResumen = () => {
    let textoResumen = `RESUMEN DE ESTUDIO - TRAMO\nDocumento: ${nombreArchivo}\nEje: ${programa || 'General'}\n\n`;
    tramos.forEach((t, i) => {
      textoResumen += `--- TRAMO ${i + 1}: ${t.titulo} (${t.paginas}) ---\n`;
      if (t.foco) {
        textoResumen += `Foco conceptual: ${t.foco}\n`;
      }
      t.preguntas.forEach((p, pIdx) => {
        const r = apuntes[t.id]?.[pIdx] || '(Sin respuesta)';
        textoResumen += `Pregunta: ${p}\nApunte: ${r}\n\n`;
      });
    });
    navigator.clipboard.writeText(textoResumen);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleModificarTramo = (targetIdx) => {
    setTramoIdx(targetIdx);
    setEditandoDesdeResumen(true);
    setPaso('chat');
    setSidebarAbierta(true);
  };

  const handleRetomarTramos = () => {
    setTramoIdx(0);
    setPaso('reading');
    setApuntes({});
    setEstadoSesionTexto('');
    setEditandoDesdeResumen(false);
    setSidebarAbierta(true);
    const docId = documentoActual?.id || documentoEntrante?.id;
    if (docId) {
      finalizarSesionEnBackend(docId, 'discard');
    }
    setDocumentoActual((prev) => (prev ? { ...prev, temp_answers: {} } : prev));
  };

  const handleVolverACuaderno = () => {
    const targetNotebook = cuadernoActual || cuadernoEntrante;
    const currentDoc = documentoActual || documentoEntrante;
    const finalTitle = tituloDocumento.trim() || nombreOriginalArchivo || currentDoc?.title;

    const updatedNotebook = targetNotebook
      ? {
          ...targetNotebook,
          documents: (targetNotebook.documents || []).map((d) =>
            d.id === currentDoc?.id
              ? {
                  ...d,
                  title: finalTitle || d.title,
                  status: (tramos && tramos.length > 0) ? 'COMPLETED' : d.status,
                  tramos: (tramos && tramos.length > 0) ? tramos : d.tramos,
                  answers: currentDoc?.answers !== undefined ? currentDoc.answers : d.answers,
                  temp_answers: currentDoc?.temp_answers !== undefined ? currentDoc.temp_answers : d.temp_answers,
                }
              : d
          ),
        }
      : null;

    const targetNbId = notebookId || targetNotebook?.id || currentDoc?.notebook;
    if (targetNbId) {
      navigate(`/notebook/${targetNbId}`);
    } else {
      navigate('/');
    }
  };

  const ejecutarEliminarDocumento = async () => {
    const docId = documentoActual?.id || documentoEntrante?.id;
    if (!docId) return;

    try {
      setEliminandoDoc(true);
      const res = await fetch(`http://localhost:8000/chat/documents/${docId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok && res.status !== 204) {
        throw new Error('Error al eliminar el documento.');
      }

      setModalEliminarAbierto(false);

      const targetNotebook = cuadernoActual || cuadernoEntrante;
      const targetNbId = notebookId || targetNotebook?.id || currentDoc?.notebook;
      if (targetNbId) {
        navigate(`/notebook/${targetNbId}`);
      } else {
        navigate('/');
      }
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

          <div className="bar-center-zone">
            <div className="top-notebook-dropdown-wrapper">
              <div className="top-notebook-badge" title={`Cuaderno: ${nombreCuaderno}`}>
                <span className="top-notebook-name">{nombreCuaderno}</span>
                <ChevronDownIcon size={12} className="top-notebook-chevron" />
              </div>

              <div className="top-notebook-dropdown-menu">
                <div className="top-notebook-dropdown-header">
                  <span className="dropdown-header-title">{nombreCuaderno}</span>
                  <span className="dropdown-header-count">
                    {documentosCuaderno.length} {documentosCuaderno.length === 1 ? 'doc' : 'docs'}
                  </span>
                </div>
                <div className="top-notebook-dropdown-list">
                  {documentosCuaderno.length === 0 ? (
                    <div className="dropdown-empty-msg">No hay otros documentos en este cuaderno.</div>
                  ) : (
                    documentosCuaderno.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`dropdown-doc-item ${d.id === currentDoc?.id ? 'is-active' : ''}`}
                        onClick={() => cargarDocumento(d)}
                        title={d.id === currentDoc?.id ? 'Documento actual' : `Abrir "${d.title || 'documento'}"`}
                      >
                        <FileTextIcon size={13} className="dropdown-doc-icon" />
                        <span className="dropdown-doc-title">
                          {d.title || 'Documento sin título'}
                        </span>
                        <span className={`dropdown-doc-status ${(d.status || 'pending').toLowerCase()}`}>
                          {d.status || 'PENDING'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bar-right-zone">
            {tramoActual && paso !== 'setup' && paso !== 'loading' && paso !== 'summary' && (
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
          <div className="sidebar-header-info">
            {paso === 'setup' && (
              <span className="tramo-counter-tag">Preparación del archivo</span>
            )}
            {paso === 'loading' && (
              <span className="tramo-counter-tag">Analizando documento</span>
            )}
            {paso !== 'setup' && paso !== 'loading' && (
              <span className="tramo-counter-tag">
                {paso === 'summary' ? 'Resumen' : `Tramo ${tramoIdx + 1}/${tramos.length}`}
              </span>
            )}
          </div>

          <div className="sidebar-actions-box">
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

                {!pdfUrl && !nombreArchivo ? (
                  <label htmlFor="pdf-upload" className="file-select-dropzone">
                    + Seleccionar archivo PDF
                  </label>
                ) : (
                  <div
                    className="file-loaded-pill is-editable-doc"
                    onClick={() => tituloTextareaRef.current?.focus()}
                  >
                    <span className="file-loaded-icon" title="Documento PDF">
                      📄
                    </span>
                    <textarea
                      ref={tituloTextareaRef}
                      className="file-loaded-title-input"
                      rows={1}
                      value={tituloDocumento}
                      onChange={handleTituloChange}
                      onBlur={handleTituloBlur}
                      onKeyDown={handleTituloKeyDown}
                      placeholder={nombreOriginalArchivo || 'Nombre del archivo'}
                      title="Clic para cambiar el nombre del documento"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuitarPdf();
                      }}
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
                  Programa de la materia:
                </label>
                <textarea
                  id="programa"
                  rows="4"
                  placeholder="Pegá temas de examen, unidades o conceptos clave a priorizar..."
                  value={programa}
                  onChange={(e) => setPrograma(e.target.value)}
                  className="obsidian-text-field"
                />

                <input
                  type="file"
                  id="overview-file-upload"
                  ref={overviewFileInputRef}
                  accept=".pdf,.txt,.docx,.doc"
                  onChange={(e) => setOverviewFile(e.target.files[0] || null)}
                  className="hidden-file-input"
                />

                {!overviewFile ? (
                  <label htmlFor="overview-file-upload" className="file-select-dropzone">
                    + Adjuntar archivo de programa o eje temático (opcional)
                  </label>
                ) : (
                  <div className="file-loaded-pill">
                    <span className="file-loaded-title" title={overviewFile.name}>
                      📎 {overviewFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOverviewFile(null);
                        if (overviewFileInputRef.current) {
                          overviewFileInputRef.current.value = '';
                        }
                      }}
                      className="btn-remove-selected-file"
                      title="Quitar archivo"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <span className="group-helper-text">
                  Podés escribir texto, adjuntar un archivo (PDF, DOCX, TXT), ambos o ninguno. La IA utilizará estos datos para estructurar las pausas y preguntas.
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

              <div className="reading-buttons-row">
                {editandoDesdeResumen || puedeVerResumen ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoDesdeResumen(false);
                      setPaso('summary');
                    }}
                    className="btn-prev-tramo"
                    title="Volver a las notas de la sesión"
                  >
                    ← Volver a notas
                  </button>
                ) : (
                  tramoIdx > 0 && (
                    <button
                      type="button"
                      onClick={handleTramoAnterior}
                      className="btn-prev-tramo"
                      title="Volver al tramo anterior"
                    >
                      ← Tramo anterior
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={handleTerminarLectura}
                  className="btn-submit-reading"
                >
                  Terminé este tramo →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: INTERFAZ DE CHAT */}
        {paso === 'chat' && tramoActual && (
          <ChatSidebar
            tramo={tramoActual}
            tramoIdx={tramoIdx}
            totalTramos={tramos.length}
            apuntes={apuntes}
            onVolverLectura={() => setPaso('reading')}
            onVolverResumen={
              editandoDesdeResumen || (currentDoc?.answers && Object.keys(currentDoc.answers).length > 0)
                ? () => {
                    setEditandoDesdeResumen(false);
                    setPaso('summary');
                  }
                : null
            }
            onGuardarApunte={(tramoId, pregIdx, texto) => {
              // 1. Guardar en estado local de React
              setApuntes((prev) => ({
                ...prev,
                [tramoId]: {
                  ...(prev[tramoId] || {}),
                  [pregIdx]: texto,
                },
              }));

              // 2. Enviar a Django (guarda en temp_answers)
              const docId = documentoActual?.id || documentoEntrante?.id;
              if (docId) {
                enviarRespuestaAlBackend(docId, tramoId, pregIdx, texto).then((res) => {
                  if (res?.status === 'saved' && res.key && res.answer) {
                    setDocumentoActual((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        temp_answers: {
                          ...(prev.temp_answers || {}),
                          [res.key]: res.answer,
                        },
                      };
                    });
                  }
                });
              }
            }}
            onAvanzar={() => {
              if (editandoDesdeResumen) {
                setEditandoDesdeResumen(false);
                setPaso('summary');
                return;
              }
              if (tramoIdx + 1 < tramos.length) {
                setTramoIdx((prev) => prev + 1);
                setPaso('reading');
              } else {
                setPaso('summary');
                consolidarPrimeraSesionSiAplica();
              }
            }}
          />
        )}

        {/* PASO 4: RESUMEN FINAL */}
        {paso === 'summary' && (
          <div className="sidebar-body-container summary-mode">
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
                  <div
                    key={t.id !== undefined ? t.id : `tramo-${i}`}
                    className="summary-block-card is-clickable"
                    onClick={() => handleModificarTramo(i)}
                    title="Clic para modificar este tramo"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleModificarTramo(i);
                      }
                    }}
                  >
                    <div className="summary-block-title-group">
                      <h4 className="summary-block-heading">
                        {i + 1}. {t.titulo}
                      </h4>
                      <span className="summary-block-pages">({t.paginas})</span>
                    </div>

                    {Array.isArray(t.preguntas) && t.preguntas.length > 0 ? (
                      t.preguntas.map((p, pIdx) => (
                        <div key={pIdx} className="qa-pair-box">
                          <span className="qa-label-q">{p}</span>
                          <p className="qa-paragraph-a">
                            {apuntes[t.id]?.[pIdx] || 'Sin notas.'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="qa-pair-box">
                        <p className="qa-paragraph-a">Sin preguntas para este tramo.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Banner de decisión si es una re-sesión sobre un documento que ya tenía notas */}
              {(() => {
                const currentDoc = documentoActual || documentoEntrante;
                const tieneRespuestasPrevias =
                  currentDoc?.answers && Object.keys(currentDoc.answers).length > 0;
                const tieneTempAnswers =
                  currentDoc?.temp_answers && Object.keys(currentDoc.temp_answers).length > 0;

                if (tieneRespuestasPrevias && tieneTempAnswers) {
                  return (
                    <div className="summary-overwrite-banner">
                      <div className="summary-overwrite-header">
                        <AlertTriangleIcon size={16} className="summary-warning-icon" />
                        <span className="summary-overwrite-title">Notas previas existentes</span>
                      </div>
                      <p className="summary-overwrite-msg">
                        Tenés notas anteriores guardadas en este documento. ¿Deseás sobreescribirlas con las de esta nueva sesión?
                      </p>
                      <div className="summary-overwrite-actions">
                        <button
                          type="button"
                          disabled={guardandoSesion}
                          onClick={async () => {
                            const docId = currentDoc?.id;
                            if (!docId) return;
                            setGuardandoSesion(true);
                            const res = await finalizarSesionEnBackend(docId, 'overwrite');
                            setGuardandoSesion(false);
                            if (res?.status === 'overwritten') {
                              setDocumentoActual((prev) => ({
                                ...(prev || {}),
                                answers: res.answers,
                                temp_answers: {},
                              }));
                              if (res.answers) {
                                setApuntes(formatearApuntesDesdeBackend(res.answers));
                              }
                              setEstadoSesionTexto('✓ Notas sobreescritas y guardadas correctamente.');
                            }
                          }}
                          className="btn-overwrite-confirm"
                        >
                          {guardandoSesion ? 'Guardando...' : 'Sobreescribir notas'}
                        </button>
                        <button
                          type="button"
                          disabled={guardandoSesion}
                          onClick={async () => {
                            const docId = currentDoc?.id;
                            if (!docId) return;
                            setGuardandoSesion(true);
                            const res = await finalizarSesionEnBackend(docId, 'discard');
                            setGuardandoSesion(false);
                            if (res?.status === 'discarded') {
                              setDocumentoActual((prev) => ({
                                ...(prev || {}),
                                temp_answers: {},
                              }));
                              if (res.answers) {
                                setApuntes(formatearApuntesDesdeBackend(res.answers));
                              }
                              setEstadoSesionTexto('✓ Se mantuvieron las notas anteriores.');
                            }
                          }}
                          className="btn-overwrite-discard"
                        >
                          Descartar borrador
                        </button>
                      </div>
                    </div>
                  );
                }

                if (estadoSesionTexto) {
                  return (
                    <div className="summary-status-badge">
                      {estadoSesionTexto}
                    </div>
                  );
                }

                return null;
              })()}

              <button
                type="button"
                onClick={handleRetomarTramos}
                className="btn-retomar-tramos"
                title="Reiniciar y volver a recorrer los tramos de este documento"
              >
                <RotateCcwIcon size={14} className="btn-retomar-icon" />
                <span>Retomar tramos</span>
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