'use client';

import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' };

/**
 * Label above, control, then hint or error. Wires id, aria-describedby and aria-invalid onto the child control.
 */
export function Field({ label, hint, error, children, className }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactElement<ControlProps>; className?: string }) {
  const generated = useId();
  const child = isValidElement(children) ? children : null;
  const id = child?.props.id ?? generated;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child?.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('hm-field', className)}>
      <label className="hm-field-label" htmlFor={id}>
        {label}
      </label>
      {child ? cloneElement(child, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : child.props['aria-invalid'] }) : children}
      {hint ? <span id={hintId} className="hm-field-hint">{hint}</span> : null}
      {error ? <span id={errorId} role="alert" className="hm-field-error">{error}</span> : null}
    </div>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('hm-input', className)} {...rest} />;
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('hm-input', className)} {...rest}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('hm-input', className)} {...rest} />;
}
