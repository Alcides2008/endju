/**
 * Texto para as fontes base do PDF (WinAnsi): os espaços finos que o Intl põe nos números passam a espaços
 * normais e caracteres que a fonte não tem saem, em vez de o pdf-lib falhar.
 */
export const pdfText = (text: string) =>
  text.replace(/[\u202f\u00a0]/g, " ").replace(/[^\x20-\x7e\u00a0-\u00ff€–—’“”•]/g, "");
