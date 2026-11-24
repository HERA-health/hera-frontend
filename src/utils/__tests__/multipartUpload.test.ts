import { buildMultipartFormData } from '../multipartUpload';

const document = { uri: 'file:///fixture/archivo', name: 'poliza-ficticia.pdf' };

test('native uploads pass the picked URI and filename to React Native networking', async () => {
  const browserFormData = globalThis.FormData;
  const native = jest.requireActual<{ default: typeof FormData }>('react-native/Libraries/Network/FormData');
  globalThis.FormData = native.default;
  try {
    const form = await buildMultipartFormData('document', document, { publicVisible: 'false' });
    expect(form.getAll('publicVisible')).toEqual(['false']);
    expect(form.getAll('document')).toEqual([{
      uri: document.uri, name: document.name, type: 'application/pdf',
    }]);
  } finally {
    globalThis.FormData = browserFormData;
  }
});

test('web uploads append the selected PDF as a file and retain its metadata', async () => {
  const pdf = new Blob(['%PDF-1.4 fixture'], { type: 'application/pdf' });
  const form = await buildMultipartFormData('document', { ...document, file: pdf }, { publicVisible: 'false' });
  expect(form.getAll('publicVisible')).toEqual(['false']);
  const [file] = form.getAll('document');
  expect(file).toMatchObject({ name: document.name, type: pdf.type, size: pdf.size });
});
