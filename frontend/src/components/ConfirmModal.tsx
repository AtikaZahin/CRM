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

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Delete' }: ConfirmModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        {message}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '0.75rem 1.5rem',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button 
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={{
            background: 'var(--danger-color)',
            border: 'none',
            color: 'white',
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
