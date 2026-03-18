import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, InputHTMLAttributes, MouseEvent, PropsWithChildren, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { AlertTriangle, Eye, EyeOff, X } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ children, className = '', variant = 'primary', ...props }: PropsWithChildren<ButtonProps>) {
  return (
    <button className={`button button-${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: FieldProps) {
  const fieldId = id ?? props.name;
  const isPasswordField = props.type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const inputType = useMemo(() => {
    if (!isPasswordField) {
      return props.type;
    }

    return showPassword ? 'text' : 'password';
  }, [isPasswordField, props.type, showPassword]);

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className={`input-wrap${isPasswordField ? ' input-wrap-password' : ''}`}>
        <input id={fieldId} className="input" {...props} type={inputType} />
        {isPasswordField ? (
          <button
            type="button"
            className="input-toggle"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar password' : 'Mostrar password'}
            title={showPassword ? 'Ocultar password' : 'Mostrar password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? <span className="error-box">{error}</span> : null}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({ label, error, id, children, ...props }: PropsWithChildren<SelectProps>) {
  const fieldId = id ?? props.name;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <select id={fieldId} className="select" {...props}>
        {children}
      </select>
      {error ? <span className="error-box">{error}</span> : null}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function TextArea({ label, id, ...props }: TextAreaProps) {
  const fieldId = id ?? props.name;
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <textarea id={fieldId} className="textarea" {...props} />
    </div>
  );
}

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <section className={`card panel ${className}`.trim()}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'neutral' | 'danger' }) {
  return <span className={`status-badge status-${tone}`}>{label}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <div style={{ marginTop: 6 }}>{description}</div>
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="error-box">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={18} />
        <strong>{title}</strong>
      </div>
      <div style={{ marginTop: 8 }}>{description}</div>
    </div>
  );
}

export function LoadingScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="loading-screen">
      <div className="loading-box">
        <div className="brand-chip">Sincronizando</div>
        <h1 className="page-title" style={{ marginTop: 16 }}>{title}</h1>
        <p className="page-subtitle">{message}</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
          <div className="skeleton" style={{ height: 18 }} />
          <div className="skeleton" style={{ height: 18, width: '84%' }} />
          <div className="skeleton" style={{ height: 18, width: '72%' }} />
        </div>
      </div>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, title, description, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const stopPropagation = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className={`modal-shell modal-${size}`} onClick={stopPropagation} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div className="modal-head-content">
            <h2 id="modal-title" className="modal-title">{title}</h2>
            {description ? <p className="page-subtitle">{description}</p> : null}
          </div>
          <Button className="icon-button" variant="secondary" onClick={onClose} aria-label="Cerrar ventana">
            <X size={16} />
          </Button>
        </div>

        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      footer={(
        <div className="button-row modal-actions">
          <Button type="button" variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button type="button" variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      )}
      size="md"
    >
      <div className="info-box">Confirma la accion para evitar perdida involuntaria de informacion.</div>
    </Modal>
  );
}
