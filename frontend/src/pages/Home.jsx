import React, { useState, useEffect, useRef } from 'react';
import './Home.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8000/chat';

export default function Home() {
  const [notebooks, setNotebooks] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cuadernoActivo, setCuadernoActivo] = useState(null);

  // Estados para la burbuja de nuevo cuaderno
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

  const fileInputRef = useRef(null);
  const inputNombreRef = useRef(null);
  const navigate = useNavigate();

  const usuario = {
    nombre: 'Gino',
    email: 'usuario@ejemplo.com',
  };

  const abrirChatDocumento = (doc) => {
    navigate('/chat', { state: { document: doc } });
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
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCuadernos();
  }, []);

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
      const res = await fetch(`${API_BASE}/documents/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al subir el archivo.');

      const nuevoDoc = await res.json();

      setCuadernoActivo((prev) => ({
        ...prev,
        documents: [nuevoDoc, ...(prev.documents || [])],
      }));

      setNotebooks((prev) =>
        prev.map((c) =>
          c.id === cuadernoActivo.id
            ? { ...c, documents: [nuevoDoc, ...(c.documents || [])] }
            : c
        )
      );
    } catch (err) {
      alert(err.message);
    } finally {
      event.target.value = '';
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
          {cargando ? (
            <div className="canvas-state-msg">
              <span className="subtle-spinner" />
              <p>Consultando catálogo...</p>
            </div>
          ) : error ? (
            <div className="canvas-state-msg">
              <p>Error de conexión: {error}</p>
            </div>
          ) : cuadernoActivo ? (
            /* Vista de Cuaderno Abierto */
            <div className="folder-detail-view">
              <header className="folder-detail-header">
                <div>
                  <button className="btn-return-link" onClick={() => setCuadernoActivo(null)}>
                    ← Volver a Cuadernos
                  </button>
                  <h1 className="folder-detail-title">{cuadernoActivo.name}</h1>
                  <span className="folder-detail-badge">
                    {cuadernoActivo.documents?.length || 0} documento{cuadernoActivo.documents?.length === 1 ? '' : 's'}
                  </span>
                </div>

                <button className="btn-subtle-action" onClick={abrirSelectorArchivo}>
                  + Subir Documento
                </button>
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
                      onClick={() => abrirChatDocumento(doc)}
                    >
                      <div className="doc-shelf-top">
                        <span className="doc-status-badge">{doc.status || 'PDF'}</span>
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
                  onClick={() => setCuadernoActivo(cuaderno)}
                >
                  <div className="card-top-row">
                    <span className="doc-counter-tag">
                      {cuaderno.documents?.length || 0} doc{cuaderno.documents?.length === 1 ? '' : 's'}
                    </span>
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
    </div>
  );
}