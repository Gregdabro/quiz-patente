import React from 'react';
import Button from './Button';

/**
 * Универсальное модальное окно подтверждения.
 * Предназначено для Chrome 92 (iPad mini 2).
 * 
 * @param {boolean} isOpen — состояние видимости
 * @param {string} title — заголовок (опционально)
 * @param {string} message — основной текст
 * @param {string} confirmText — текст кнопки подтверждения
 * @param {string} cancelText — текст кнопки отмены
 * @param {function} onConfirm — обработчик подтверждения
 * @param {function} onCancel — обработчик отмены
 */
const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Да',
  cancelText = 'Нет',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <Button 
            variant="falso" 
            onClick={onCancel}
            style={{ marginRight: 'var(--spacing-4)', minWidth: '100px' }}
          >
            {cancelText}
          </Button>
          <Button 
            variant="vero" 
            onClick={onConfirm}
            style={{ minWidth: '100px' }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
