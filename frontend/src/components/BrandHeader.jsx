import React from 'react';
import { Link } from 'react-router-dom';
import './BrandHeader.css';

/**
 * Componente reutilizable de Cabecera / Logo de TRAMO.
 * Modificando este archivo podés cambiar el nombre, subtítulo o logo para toda la aplicación.
 */
export default function BrandHeader({ clickable = false, onClick }) {
  const title = (
    <h1 className={`brand-logo-title ${clickable ? 'brand-link' : ''}`}>
      TRAMO
    </h1>
  );

  return (
    <header className="brand-external-header">
      {clickable ? (
        <Link
          to="/"
          onClick={onClick}
          className="brand-header-link"
          title="Ir a la lista de cuadernos"
        >
          {title}
        </Link>
      ) : (
        title
      )}
      <p className="brand-logo-subtitle">
        Asistente de lectura académica
      </p>
    </header>
  );
}
