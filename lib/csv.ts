export function toSafeCsvCell(value: unknown): string {
  let normalized = String(value ?? '').replace(/[\r\n]+/g, ' ');
  const formulaProbe = normalized.replace(/^[\u0000-\u0020\u007f]+/, '');
  if (/^[=+\-@]/.test(formulaProbe)) {
    normalized = `'${normalized}`;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}
