'use client';

import { useState, type InputHTMLAttributes } from 'react';

/** Native date input that shows "Add date" (like the design) instead of the browser's mm/dd/yyyy while empty. */
export function DateInput({ placeholder = 'Add date', defaultValue, onChange, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [empty, setEmpty] = useState(!defaultValue);
  return (
    <span className="hm-date-wrap" data-empty={empty ? 'true' : 'false'}>
      <input
        type="date"
        defaultValue={defaultValue}
        onChange={event => {
          setEmpty(!event.target.value);
          onChange?.(event);
        }}
        {...rest}
      />
      <span className="hm-date-ph" aria-hidden="true">
        {placeholder}
      </span>
    </span>
  );
}
