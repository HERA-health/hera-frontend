import { privateDocumentFileName } from '../openPrivateDocument';

it.each(['pdf', 'docx', 'png'])('preserves the %s extension when shortening long download names', extension => {
  const name = privateDocumentFileName('a'.repeat(165) + '.' + extension);
  expect(name).toHaveLength(160);
  expect(name.endsWith('.' + extension)).toBe(true);
});

it('preserves ordinary filenames and sanitizes path characters', () => {
  expect(privateDocumentFileName('Consentimiento informado.pdf')).toBe('Consentimiento informado.pdf');
  expect(privateDocumentFileName('carpeta/documento.docx')).toBe('carpeta_documento.docx');
});
