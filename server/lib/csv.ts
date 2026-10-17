/**
 * RFC 4180 CSV with formula-injection protection: cells that a spreadsheet
 * would evaluate (=, +, -, @, tab, CR) are prefixed with a single quote.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function toCsvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  const safe = FORMULA_TRIGGER.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  // Leading BOM so Excel opens UTF-8 (Myanmar names) correctly.
  return `﻿${rows.map((row) => row.map(toCsvCell).join(',')).join('\r\n')}`;
}
