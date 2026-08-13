import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Delete' 
}: ConfirmModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
        {message}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button 
          onClick={onClose}
          className="btn btn-outline btn-sm"
          style={{ borderRadius: 0 }}
        >
          Cancel
        </button>
        <button 
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="btn btn-danger btn-sm"
          style={{ 
            background: 'var(--ember)', 
            color: '#ffffff', 
            border: 'none',
            borderRadius: 0 
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
