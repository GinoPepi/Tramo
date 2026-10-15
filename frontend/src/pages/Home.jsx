import React, { useState, useEffect, useRef } from 'react';
import './Home.css';
import { useNavigate, useLocation } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { TrashIcon, ChevronLeftIcon, ChevronDownIcon, FileTextIcon, PlusIcon } from '../components/Icons';

const API_BASE = 'http://localhost:8000/chat';

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const [notebooks, setNotebooks] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuadernoActivo, setCuadernoActivo] = useState(() => location.state?.notebook || null);
  const [subiendoDoc, setSubiendoDoc] = useState(false);

  // Estados para la burbuja de nuevo cuaderno
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  // Estados para modal de Título del cuaderno
  const [modalTituloAbierto, setModalTituloAbierto] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [guardandoTitulo, setGuardandoTitulo] = useState(false);

  const [modalDescAbierto, setModalDescAbierto] = useState(false);
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [guardandoDesc, setGuardandoDesc] = useState(false);

  // Estados para modal de Syllabus del cuaderno
  const [modalSyllabusAbierto, setModalSyllabusAbierto] = useState(false);
  const [nuevoSyllabusTexto, setNuevoSyllabusTexto] = useState('');
  const [nuevoSyllabusArchivo, setNuevoSyllabusArchivo] = useState(null);
  const [eliminarSyllabusArchivo, setEliminarSyllabusArchivo] = useState(false);
  const [guardandoSyllabus, setGuardandoSyllabus] = useState(false);
  const syllabusFileInputRef = useRef(null);

  // Estados para el modal in-app de confirmación de eliminación
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const [eliminandoItem, setEliminandoItem] = useState(false);

  const fileInputRef = useRef(null);
  const inputNombreRef = useRef(null);

  const usuario = {
    nombre: 'Gino',
    email: 'usuario@ejemplo.com',
  };

  const abrirChatDocumento = (doc, cuaderno = cuadernoActivo) => {
    const freshCuaderno = notebooks.find((n) => n.id === (cuaderno?.id || doc?.notebook)) || cuaderno;
    const freshDoc = freshCuaderno?.documents?.find((d) => d.id === doc.id) || doc;

    navigate('/chat', {
      state: {
        document: freshDoc,
        notebook: freshCuaderno,
        notebookId: freshCuaderno?.id || freshDoc?.notebook,
      },
    });
  };

  const volverAListaCuadernos = () => {
    setCuadernoActivo(null);
    navigate('/', { replace: true, state: {} });
  };

  // 1. GET: Cargar cuadernos
  const cargarCuadernos = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch(`${API_BASE}/notebooks/`);
      if (!res.ok) throw new Error('No se pudo conectar con el catálogo de cuadernos.');
      const data = await res.json();
      setNotebooks(data);

      const targetId = location.state?.notebookId || location.state?.notebook?.id;
      if (targetId) {
        const found = data.find((n) => n.id === targetId);
        if (found) {
          setCuadernoActivo(found);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCuadernos();
  }, []);

  // Sincronizar cuadernoActivo si location.state cambia o al cargar notebooks frescos
  useEffect(() => {
    const targetId = location.state?.notebookId || location.state?.notebook?.id;
    if (targetId && notebooks.length > 0) {
      const found = notebooks.find((n) => n.id === targetId);
      if (found) {
        setCuadernoActivo(found);
        return;
      }
    }
    if (location.state?.notebook) {
      setCuadernoActivo(location.state.notebook);
    }
  }, [location.state, notebooks]);

  // Autofoco y escape en el modal
  useEffect(() => {
    if (modalAbierto) {
      setTimeout(() => inputNombreRef.current?.focus(), 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') cerrarModal();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [modalAbierto]);

  const abrirModal = () => {
    setNuevoNombre('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setNuevoNombre('');
  };

  // 2. POST: Guardar nuevo cuaderno
  const handleCrearCuaderno = async (e) => {
    e.preventDefault();
    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio || guardando) return;

    try {
      setGuardando(true);
      const res = await fetch(`${API_BASE}/notebooks/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombreLimpio }),
      });

      if (!res.ok) throw new Error('Error al guardar el cuaderno en la base de datos.');

      const nuevoNotebook = await res.json();
      setNotebooks((prev) => [nuevoNotebook, ...prev]);
      cerrarModal();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // 2b. PATCH: Guardar Descripción del cuaderno
  const abrirModalDescripcion = () => {
    setNuevaDescripcion(cuadernoActivo?.description || '');
    setModalDescAbierto(true);
  };

  const cerrarModalDescripcion = () => {
    setModalDescAbierto(false);
    setNuevaDescripcion('');
  };

  const handleGuardarDescripcion = async (e) => {
    e.preventDefault();
    if (!cuadernoActivo || guardandoDesc) return;

    try {
      setGuardandoDesc(true);
      const res = await fetch(`${API_BASE}/notebooks/${cuadernoActivo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: nuevaDescripcion.trim() }),
      });

      if (!res.ok) throw new Error('Error al actualizar la descripción del cuaderno.');
      const actualizado = await res.json();

      setCuadernoActivo((prev) => ({ ...prev, description: actualizado.description }));
      setNotebooks((prev) =>
        prev.map((n) => (n.id === cuadernoActivo.id ? { ...n, description: actualizado.description } : n))
      );
      cerrarModalDescripcion();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoDesc(false);
    }
  };

  // 2b-bis. PATCH: Guardar Título / Nombre del cuaderno
  const abrirModalTitulo = () => {
    setNuevoTitulo(cuadernoActivo?.name || '');
    setModalTituloAbierto(true);
  };

  const cerrarModalTitulo = () => {
    setModalTituloAbierto(false);
    setNuevoTitulo('');
  };

  const handleGuardarTitulo = async (e) => {
    e.preventDefault();
    const nombreLimpio = nuevoTitulo.trim();
    if (!cuadernoActivo || !nombreLimpio || guardandoTitulo) return;

    try {
      setGuardandoTitulo(true);
      const res = await fetch(`${API_BASE}/notebooks/${cuadernoActivo.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombreLimpio }),
      });

      if (!res.ok) throw new Error('Error al actualizar el nombre del cuaderno.');
      const actualizado = await res.json();

      setCuadernoActivo((prev) => ({ ...prev, name: actualizado.name }));
      setNotebooks((prev) =>
        prev.map((n) => (n.id === cuadernoActivo.id ? { ...n, name: actualizado.name } : n))
      );
      cerrarModalTitulo();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoTitulo(false);
    }
  };

  // 2c. PATCH: Guardar Syllabus del cuaderno (texto y/o archivo)
  const abrirModalSyllabus = () => {
    setNuevoSyllabusTexto(cuadernoActivo?.syllabus_text || '');
    setNuevoSyllabusArchivo(null);
    setEliminarSyllabusArchivo(false);
    setModalSyllabusAbierto(true);
  };

  const cerrarModalSyllabus = () => {
    setModalSyllabusAbierto(false);
    setNuevoSyllabusTexto('');
    setNuevoSyllabusArchivo(null);
    setEliminarSyllabusArchivo(false);
  };

  const handleGuardarSyllabus = async (e) => {
    e.preventDefault();
    if (!cuadernoActivo || guardandoSyllabus) return;

    try {
      setGuardandoSyllabus(true);
      const formData = new FormData();
      formData.append('syllabus_text', nuevoSyllabusTexto);
      if (nuevoSyllabusArchivo) {
        formData.append('syllabus_file', nuevoSyllabusArchivo);
      } else if (eliminarSyllabusArchivo) {
        formData.append('syllabus_file', '');
      }

      const res = await fetch(`${API_BASE}/notebooks/${cuadernoActivo.id}/`, {
        method: 'PATCH',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al guardar el syllabus del cuaderno.');
      const actualizado = await res.json();

      setCuadernoActivo((prev) => ({
        ...prev,
        syllabus_text: actualizado.syllabus_text,
        syllabus_file: actualizado.syllabus_file,
      }));
      setNotebooks((prev) =>
        prev.map((n) =>
          n.id === cuadernoActivo.id
            ? {
                ...n,
                syllabus_text: actualizado.syllabus_text,
                syllabus_file: actualizado.syllabus_file,
              }
            : n
        )
      );
      cerrarModalSyllabus();
    } catch (err) {
      alert(err.message);
    } finally {
      setGuardandoSyllabus(false);
    }
  };

  // 3. Subir archivo PDF
  const abrirSelectorArchivo = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const subirDocumento = async (event) => {
    const file = event.target.files[0];
    if (!file || !cuadernoActivo) return;

    const formData = new FormData();
    formData.append('notebook', cuadernoActivo.id);
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      setSubiendoDoc(true);
      const res = await fetch(`${API_BASE}/documents/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir el archivo.');

      const nuevoDoc = await res.json();

      const cuadernoActualizado = {
        ...cuadernoActivo,
        documents: [nuevoDoc, ...(cuadernoActivo.documents || [])],
      };

      setCuadernoActivo(cuadernoActualizado);

      setNotebooks((prev) =>
        prev.map((c) =>
          c.id === cuadernoActivo.id
            ? cuadernoActualizado
            : c
        )
      );

      // Abrir automáticamente la vista de estudio/chat con el documento nuevo
      abrirChatDocumento(nuevoDoc, cuadernoActualizado);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubiendoDoc(false);
      event.target.value = '';
    }
  };

  // 4. DELETE: Eliminar cuaderno con modal in-app
  const solicitarEliminarCuaderno = (cuadernoId, cuadernoNombre) => {
    setModalConfirmacion({
      tipo: 'cuaderno',
      id: cuadernoId,
      titulo: '¿Eliminar cuaderno?',
      mensaje: `¿Estás seguro de que querés eliminar el cuaderno "${cuadernoNombre || 'seleccionado'}"? Se eliminarán también todos sus documentos asociados.`,
      accion: () => ejecutarEliminarCuaderno(cuadernoId),
    });
  };

  const ejecutarEliminarCuaderno = async (cuadernoId) => {
    try {
      setEliminandoItem(true);
      const res = await fetch(`${API_BASE}/notebooks/${cuadernoId}/`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error('Error al eliminar el cuaderno.');
      }

      setNotebooks((prev) => prev.filter((n) => n.id !== cuadernoId));

      if (cuadernoActivo && cuadernoActivo.id === cuadernoId) {
        volverAListaCuadernos();
      }
      setModalConfirmacion(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setEliminandoItem(false);
    }
  };

  // 5. DELETE: Eliminar documento con modal in-app
  const solicitarEliminarDocumento = (docId, docTitulo) => {
    setModalConfirmacion({
      tipo: 'documento',
      id: docId,
      titulo: '¿Eliminar documento?',
      mensaje: `¿Estás seguro de que querés eliminar el documento "${docTitulo || 'seleccionado'}"?`,
      accion: () => ejecutarEliminarDocumento(docId),
    });
  };

  const ejecutarEliminarDocumento = async (docId) => {
    try {
      setEliminandoItem(true);
      const res = await fetch(`${API_BASE}/documents/${docId}/`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        throw new Error('Error al eliminar el documento.');
      }

      setCuadernoActivo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: (prev.documents || []).filter((d) => d.id !== docId),
        };
      });

      setNotebooks((prev) =>
        prev.map((c) => {
          if (cuadernoActivo && c.id === cuadernoActivo.id) {
            return {
              ...c,
              documents: (c.documents || []).filter((d) => d.id !== docId),
            };
          }
          return c;
        })
      );
      setModalConfirmacion(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setEliminandoItem(false);
    }
  };

  return (
    <div className="obsidian-app-layout">
      <input
        type="file"
        ref={fileInputRef}
        onChange={subirDocumento}
        accept=".pdf"
        style={{ display: 'none' }}
      />

      {/* 1. PERFIL FLOTANTE */}
      <aside className="user-profile-anchor">
        <button
          className={`user-avatar-pill ${menuAbierto ? 'active' : ''}`}
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label="Menú de perfil"
        >
          <span className="user-initial">
            {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : 'U'}
          </span>
          <span className="user-status-dot" />
        </button>

        {menuAbierto && (
          <div className="user-popover-card">
            <div className="popover-meta">
              <span className="meta-tag">SESIÓN ACTIVA</span>
              <span className="meta-name">{usuario.nombre}</span>
              <span className="meta-email">{usuario.email}</span>
            </div>

            <div className="popover-divider" />

            <nav className="popover-actions">
              <button onClick={() => alert('Mi perfil')}>Mi Perfil</button>
              <button onClick={() => alert('Configurar')}>Configurar cuenta</button>
              <div className="popover-divider" />
              <button className="btn-logout" onClick={() => alert('Cerrar sesión')}>
                Cerrar Sesión
              </button>
            </nav>
          </div>
        )}
      </aside>

      {/* 2. ÁREA CENTRAL */}
      <main className="obsidian-stage-container">
        <section className="obsidian-canvas">
          {cargando && !cuadernoActivo ? (
            <div className="canvas-state-msg">
              <span className="subtle-spinner" />
              <p>Consultando catálogo...</p>
            </div>
          ) : error && !cuadernoActivo ? (
            <div className="canvas-state-msg">
              <p>Error de conexión: {error}</p>
            </div>
          ) : cuadernoActivo ? (
            /* Vista de Cuaderno Abierto */
            <div className="folder-detail-view">
              <header className="folder-detail-header">
                {/* 1. Fila superior: Título, descripción y programa en el centro; botón eliminar a la derecha */}
                <div className="folder-top-bar">
                  <div className="folder-top-center">
                    {/* Título como botón interactivo para editar */}
                    <button
                      type="button"
                      className="folder-detail-title-btn"
                      onClick={abrirModalTitulo}
                      title="Clic para modificar el nombre del cuaderno"
                    >
                      <h1 className="folder-detail-title">{cuadernoActivo.name}</h1>
                    </button>

                    {/* Descripción como texto: muestra el texto si existe o la palabra "Descripción", clic para modificar */}
                    <button
                      type="button"
                      className={`folder-inline-desc-btn ${!cuadernoActivo.description ? 'is-empty' : ''}`}
                      onClick={abrirModalDescripcion}
                      title="Clic para modificar la descripción"
                    >
                      {cuadernoActivo.description || 'Descripción'}
                    </button>

                    {/* Programa como texto colapsable: al pasar el cursor se expande mostrando archivo, texto o ambos */}
                    <div className="folder-inline-programa-wrapper">
                      <button
                        type="button"
                        className="folder-programa-trigger-btn"
                        onClick={abrirModalSyllabus}
                        title="Clic para modificar el programa"
                      >
                        <span className="folder-programa-trigger-text">Programa</span>
                        <ChevronDownIcon size={12} className="folder-programa-chevron" />
                      </button>

                      <div className="folder-programa-expandable">
                        <div
                          className="folder-programa-card"
                          onClick={abrirModalSyllabus}
                          title="Clic para modificar el programa"
                        >
                          {cuadernoActivo.syllabus_file && (
                            <div className="programa-card-file-row">
                              <FileTextIcon size={14} className="programa-card-file-icon" />
                              <a
                                href={
                                  cuadernoActivo.syllabus_file.startsWith('http')
                                    ? cuadernoActivo.syllabus_file
                                    : `http://localhost:8000${cuadernoActivo.syllabus_file}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="programa-card-file-link"
                                onClick={(e) => e.stopPropagation()}
                                title="Abrir archivo adjunto"
                              >
                                {cuadernoActivo.syllabus_file.split('/').pop()}
                              </a>
                            </div>
                          )}

                          {cuadernoActivo.syllabus_text && (
                            <div className="programa-card-text-block">
                              <p className="programa-card-text-content">
                                {cuadernoActivo.syllabus_text}
                              </p>
                            </div>
                          )}

                          {!cuadernoActivo.syllabus_file && !cuadernoActivo.syllabus_text && (
                            <p className="programa-card-empty-note">
                              Sin programa asignado. Clic para agregar.
                            </p>
                          )}

                          <span className="programa-card-edit-hint">Clic para editar</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="folder-top-right">
                    <button
                      type="button"
                      className="btn-expand-delete"
                      onClick={() => solicitarEliminarCuaderno(cuadernoActivo.id, cuadernoActivo.name)}
                      title="Eliminar cuaderno"
                      aria-label={`Eliminar cuaderno ${cuadernoActivo.name}`}
                    >
                      <span className="delete-icon-box">
                        <TrashIcon size={16} />
                      </span>
                      <span className="delete-text-label">Eliminar cuaderno</span>
                    </button>
                  </div>
                </div>

                {/* 2. Fila inferior: "Volver a Cuadernos" a la izquierda, botón "+ Documento" a la derecha */}
                <div className="folder-action-bar">
                  <div className="folder-action-left">
                    <button
                      type="button"
                      className="btn-nav-return"
                      onClick={volverAListaCuadernos}
                      title="Volver a Cuadernos"
                    >
                      <ChevronLeftIcon size={14} className="btn-return-chevron" />
                      <span>Volver a Cuadernos</span>
                    </button>
                  </div>

                  <div className="folder-header-actions">
                    <button
                      type="button"
                      className="btn-subtle-action"
                      onClick={abrirSelectorArchivo}
                      disabled={subiendoDoc}
                      title="Subir nuevo documento"
                    >
                      <PlusIcon size={13} className="btn-action-plus" />
                      <span>{subiendoDoc ? 'Subiendo...' : 'Documento'}</span>
                    </button>
                  </div>
                </div>
              </header>

              <div className="docs-grid-shelf">
                {!cuadernoActivo.documents || cuadernoActivo.documents.length === 0 ? (
                  <div className="canvas-state-msg">
                    <p>No hay textos ingresados en este cuaderno.</p>
                  </div>
                ) : (
                  cuadernoActivo.documents.map((doc) => (
                    <article
                      key={doc.id}
                      className="doc-shelf-card"
                      onClick={() => abrirChatDocumento(doc, cuadernoActivo)}
                    >
                      <div className="doc-shelf-top">
                        <span className={`doc-status-badge ${(doc.status || 'pending').toLowerCase()}`}>
                          {doc.status || 'PENDING'}
                        </span>
                        <button
                          type="button"
                          className="btn-card-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            solicitarEliminarDocumento(doc.id, doc.title);
                          }}
                          title="Eliminar documento"
                          aria-label={`Eliminar documento ${doc.title}`}
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                      <h3 className="doc-shelf-title">{doc.title}</h3>
                      <span className="doc-shelf-date">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </article>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Grilla Principal de Cuadernos */
            <div className="notebooks-grid-shelf">
              {/* Tarjeta Nuevo Cuaderno (+) */}
              <button className="card-add-notebook" onClick={abrirModal}>
                <div className="add-icon-ring">+</div>
                <span className="add-text-label">Nuevo Cuaderno</span>
              </button>

              {/* Tarjetas de Cuadernos */}
              {notebooks.map((cuaderno) => (
                <div
                  key={cuaderno.id}
                  className="notebook-shelf-card"
                  onClick={() => {
                    navigate('/', { replace: true, state: { notebookId: cuaderno.id, notebook: cuaderno } });
                    setCuadernoActivo(cuaderno);
                  }}
                >
                  <div className="card-top-row">
                    <span className="doc-counter-tag">
                      {cuaderno.documents?.length || 0} doc{cuaderno.documents?.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      className="btn-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        solicitarEliminarCuaderno(cuaderno.id, cuaderno.name);
                      }}
                      title="Eliminar cuaderno"
                      aria-label={`Eliminar cuaderno ${cuaderno.name}`}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                  <div className="card-middle-row">
                    <h2 className="notebook-title-heading">{cuaderno.name}</h2>
                  </div>
                  <div className="card-bottom-row">
                    <span className="open-prompt">Abrir →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 3. BURBUJA FLOTANTE PARA CREAR CUADERNO */}
      {modalAbierto && (
        <div className="modal-backdrop-overlay" onClick={cerrarModal}>
          <div className="modal-bubble-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-bubble-meta">
              <span className="modal-kicker">NUEVA ENTRADA</span>
              <h3 className="modal-heading">Crear Cuaderno</h3>
            </div>

            <form onSubmit={handleCrearCuaderno} className="modal-bubble-form">
              <input
                ref={inputNombreRef}
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Nombre del cuaderno (ej: Psicología Social)"
                className="modal-bubble-input"
                maxLength={150}
              />

              <div className="modal-bubble-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={!nuevoNombre.trim() || guardando}
                >
                  {guardando ? 'Creando...' : 'Crear Cuaderno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3b. MODAL EDITAR TÍTULO / NOMBRE */}
      {modalTituloAbierto && (
        <div className="modal-backdrop-overlay" onClick={cerrarModalTitulo}>
          <div className="modal-bubble-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-bubble-meta">
              <span className="modal-kicker">{cuadernoActivo?.name || 'Cuaderno'}</span>
              <h3 className="modal-heading">Nombre del Cuaderno</h3>
            </div>

            <form onSubmit={handleGuardarTitulo} className="modal-bubble-form">
              <input
                type="text"
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                placeholder="Nombre del cuaderno..."
                className="modal-bubble-input"
                maxLength={150}
                autoFocus
              />

              <div className="modal-bubble-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={cerrarModalTitulo}
                  disabled={guardandoTitulo}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={!nuevoTitulo.trim() || guardandoTitulo}
                >
                  {guardandoTitulo ? 'Guardando...' : 'Guardar Nombre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL EDITAR DESCRIPCIÓN */}
      {modalDescAbierto && (
        <div className="modal-backdrop-overlay" onClick={cerrarModalDescripcion}>
          <div className="modal-bubble-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-bubble-meta">
              <span className="modal-kicker">{cuadernoActivo?.name || 'Cuaderno'}</span>
              <h3 className="modal-heading">Descripción del Cuaderno</h3>
            </div>

            <form onSubmit={handleGuardarDescripcion} className="modal-bubble-form">
              <textarea
                rows="4"
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
                placeholder="Ingresá una descripción o contexto general del cuaderno..."
                className="modal-bubble-textarea"
                autoFocus
              />

              <div className="modal-bubble-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={cerrarModalDescripcion}
                  disabled={guardandoDesc}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={guardandoDesc}
                >
                  {guardandoDesc ? 'Guardando...' : 'Guardar Descripción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL EDITAR SYLLABUS */}
      {modalSyllabusAbierto && (
        <div className="modal-backdrop-overlay" onClick={cerrarModalSyllabus}>
          <div className="modal-bubble-card modal-bubble-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-bubble-meta">
              <span className="modal-kicker">{cuadernoActivo?.name || 'Cuaderno'}</span>
              <h3 className="modal-heading">Programa de la Materia</h3>
            </div>

            <form onSubmit={handleGuardarSyllabus} className="modal-bubble-form">
              <textarea
                rows="4"
                value={nuevoSyllabusTexto}
                onChange={(e) => setNuevoSyllabusTexto(e.target.value)}
                placeholder="Pegá temas de examen, unidades o conceptos clave a priorizar..."
                className="modal-bubble-textarea"
                autoFocus
              />

              <input
                type="file"
                id="notebook-syllabus-file-upload"
                ref={syllabusFileInputRef}
                accept=".pdf,.txt,.docx,.doc"
                onChange={(e) => {
                  const file = e.target.files[0] || null;
                  setNuevoSyllabusArchivo(file);
                  if (file) setEliminarSyllabusArchivo(false);
                }}
                style={{ display: 'none' }}
              />

              {!nuevoSyllabusArchivo && cuadernoActivo?.syllabus_file && !eliminarSyllabusArchivo && (
                <div
                  className="file-loaded-pill is-clickable"
                  onClick={() => syllabusFileInputRef.current?.click()}
                  title="Clic para cambiar el archivo"
                >
                  <span className="file-loaded-title" title={cuadernoActivo.syllabus_file}>
                    📎 Archivo actual: {cuadernoActivo.syllabus_file.split('/').pop()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEliminarSyllabusArchivo(true);
                      if (syllabusFileInputRef.current) syllabusFileInputRef.current.value = '';
                    }}
                    className="btn-remove-selected-file"
                    title="Eliminar este archivo del programa"
                    aria-label="Eliminar archivo"
                  >
                    ✕
                  </button>
                </div>
              )}

              {!nuevoSyllabusArchivo && (!cuadernoActivo?.syllabus_file || eliminarSyllabusArchivo) && (
                <label htmlFor="notebook-syllabus-file-upload" className="file-select-dropzone">
                  + Adjuntar archivo (.pdf, .txt, .docx)
                </label>
              )}

              {nuevoSyllabusArchivo && (
                <div
                  className="file-loaded-pill is-clickable"
                  onClick={() => syllabusFileInputRef.current?.click()}
                  title="Clic para cambiar el archivo"
                >
                  <span className="file-loaded-title" title={nuevoSyllabusArchivo.name}>
                    📎 {nuevoSyllabusArchivo.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNuevoSyllabusArchivo(null);
                      if (cuadernoActivo?.syllabus_file) {
                        setEliminarSyllabusArchivo(true);
                      }
                      if (syllabusFileInputRef.current) syllabusFileInputRef.current.value = '';
                    }}
                    className="btn-remove-selected-file"
                    title="Eliminar archivo seleccionado"
                    aria-label="Eliminar archivo"
                  >
                    ✕
                  </button>
                </div>
              )}

              <span className="group-helper-text">
                Podés escribir texto, subir un archivo, ambos o ninguno.
              </span>

              <div className="modal-bubble-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={cerrarModalSyllabus}
                  disabled={guardandoSyllabus}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={guardandoSyllabus}
                >
                  {guardandoSyllabus ? 'Guardando...' : 'Guardar Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL IN-APP DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmModal
        isOpen={!!modalConfirmacion}
        title={modalConfirmacion?.titulo}
        message={modalConfirmacion?.mensaje}
        loading={eliminandoItem}
        onClose={() => setModalConfirmacion(null)}
        onConfirm={() => modalConfirmacion?.accion?.()}
      />
    </div>
  );
}