import React, { useEffect, useRef } from 'react';
import './ConfirmModal.css';
import { TrashIcon } from './Icons';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Eliminar elemento?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  loading = false,
  danger = true,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay" onClick={!loading ? onClose : undefined}>
      <div
        className="confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="confirm-modal-header">
          <div className="confirm-icon-badge">
            <TrashIcon size={18} />
          </div>
          <div className="confirm-header-text">
            <span className="confirm-modal-kicker">CONFIRMAR ACCIÓN</span>
            <h3 id="confirm-modal-title" className="confirm-modal-title">{title}</h3>
          </div>
        </div>

        <p className="confirm-modal-message">{message}</p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn-confirm-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            ref={confirmBtnRef}
            className={`btn-confirm-action ${danger ? 'is-danger' : 'is-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-confirm-loading">
                <span className="confirm-spinner" />
                Eliminando...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
