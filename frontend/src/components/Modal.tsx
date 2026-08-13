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
    <div 
      className="modal-overlay" 
      onClick={(e) => { 
        if (e.target === e.currentTarget) onClose(); 
      }}
    >
      <div className="modal" style={{ borderRadius: 0 }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-icon"
            style={{ fontSize: '1.25rem', lineHeight: 1 }}
            title="Close"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
