import React, { useState, useEffect, useRef } from 'react';
import './Home.css';
import { useNavigate, useLocation } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';
import { TrashIcon, ChevronLeftIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8000/chat';

export default function Home() {
  const { user, token, logout } = useAuth();
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

  // Estados para el modal in-app de confirmación de eliminación
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const [eliminandoItem, setEliminandoItem] = useState(false);

  const fileInputRef = useRef(null);
  const inputNombreRef = useRef(null);

  // Datos reales del usuario autenticado
  const nombreUsuario = user?.first_name || user?.username || 'Usuario';
  const inicialUsuario = (user?.first_name || user?.username || 'U').charAt(0).toUpperCase();
  const emailUsuario = user?.email || (user?.username ? `${user.username}@tramo.app` : 'usuario@tramo.app');

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
    if (!token) return;
    try {
      setCargando(true);
      setError(null);
      const res = await fetch(`${API_BASE}/notebooks/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
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
    if (token) {
      cargarCuadernos();
    }
  }, [token]);

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
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
        headers: {
          'Authorization': `Token ${token}`,
        },
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
        headers: {
          'Authorization': `Token ${token}`,
        },
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
        headers: {
          'Authorization': `Token ${token}`,
        },
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
            {inicialUsuario}
          </span>
          <span className="user-status-dot" />
        </button>

        {menuAbierto && (
          <div className="user-popover-card">
            <div className="popover-meta">
              <span className="meta-tag">SESIÓN ACTIVA</span>
              <span className="meta-name">{nombreUsuario}</span>
              <span className="meta-email">{emailUsuario}</span>
            </div>

            <div className="popover-divider" />

            <nav className="popover-actions">
              <button onClick={() => alert(`Perfil: ${nombreUsuario} (@${user?.username || 'usuario'})`)}>
                Mi Perfil
              </button>
              <button onClick={() => alert('Configurar')}>Configurar cuenta</button>
              <div className="popover-divider" />
              <button className="btn-logout" onClick={logout}>
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
                <div>
                  <button
                    type="button"
                    className="btn-nav-return"
                    onClick={volverAListaCuadernos}
                    title="Volver a Cuadernos"
                  >
                    <ChevronLeftIcon size={14} className="btn-return-chevron" />
                    <span>Volver a Cuadernos</span>
                  </button>
                  <h1 className="folder-detail-title">{cuadernoActivo.name}</h1>
                  <span className="folder-detail-badge">
                    {cuadernoActivo.documents?.length || 0} documento{cuadernoActivo.documents?.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="folder-header-actions">
                  <button
                    type="button"
                    className="btn-danger-action"
                    onClick={() => solicitarEliminarCuaderno(cuadernoActivo.id, cuadernoActivo.name)}
                    title="Eliminar cuaderno"
                  >
                    <TrashIcon size={14} />
                    <span>Eliminar Cuaderno</span>
                  </button>
                  <button
                    className="btn-subtle-action"
                    onClick={abrirSelectorArchivo}
                    disabled={subiendoDoc}
                  >
                    {subiendoDoc ? 'Subiendo...' : '+ Subir Documento'}
                  </button>
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

      {/* 4. MODAL IN-APP DE CONFIRMACIÓN DE ELIMINACIÓN */}
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