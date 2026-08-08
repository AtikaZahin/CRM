import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        position: 'relative',
        backgroundColor: 'var(--bg-color)' // solid background so content isn't hard to read
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem', right: '1rem',
            background: 'none', border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1.5rem',
            lineHeight: 1
          }}
        >
          &times;
        </button>
        <h2 style={{ marginBottom: '1.5rem' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;
