// Browser-side file -> plain text. Supports PDF, DOCX, TXT/MD.
// Everything runs locally; nothing is uploaded anywhere.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function parsePdf(buf: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ('str' in it ? (it as { str: string }).str : ''))
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n');
}

async function parseDocx(buf: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB guard

/** Read a single file into plain text. Throws a friendly error on failure. */
export async function fileToText(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('File is larger than 12 MB.');
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith('.pdf')) return parsePdf(buf);
  if (name.endsWith('.docx')) return parseDocx(buf);
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf')) {
    return new TextDecoder().decode(buf);
  }
  // last resort: try plain text decode
  const text = new TextDecoder().decode(buf);
  // Control chars are intentional here — they signal binary (non-text) content.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0e-\x1f]/.test(text.slice(0, 200))) {
    throw new Error(`Unsupported file type: ${file.name}. Use PDF, DOCX, TXT or MD.`);
  }
  return text;
}

/** Read and concatenate several files (e.g. resume + cover letter). */
export async function filesToText(files: File[]): Promise<string> {
  const parts = await Promise.all(files.map(fileToText));
  return parts.join('\n\n');
}
