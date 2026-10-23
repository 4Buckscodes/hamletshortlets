/** Escapes and downloads a CSV file safely in the browser (formula-injection protected). */
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): void {
  const escapeCell = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    const trimmed = String(value);
    const formulaSafe = /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
    if (/[",\r\n]/.test(formulaSafe)) {
      return `"${formulaSafe.replace(/"/g, '""')}"`;
    }
    return formulaSafe;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(',')),
  ];
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
