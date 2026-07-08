import fs from 'node:fs';
import path from 'node:path';

const publicReviewScreenPath = path.join(__dirname, '..', 'PublicReviewScreen.tsx');

describe('PublicReviewScreen public invitation states', () => {
  const source = fs.readFileSync(publicReviewScreenPath, 'utf8');

  it('treats already submitted public reviews as a completed state', () => {
    expect(source).toContain("getErrorCode(submitError) === 'ALREADY_SUBMITTED'");
    expect(source).toContain("setSubmittedStatus('SUBMITTED')");
    expect(source).toContain('Gracias por tu reseña');
  });

  it('supports edit mode with visible-name selection', () => {
    expect(source).toContain("invitation?.status === 'EDITABLE'");
    expect(source).toContain('Actualizar reseña');
    expect(source).toContain('AuthorDisplaySelector');
    expect(source).toContain('Sesión HERA verificada');
  });
});
