import fs from 'node:fs';
import path from 'node:path';

const reviewModalPath = path.join(__dirname, '..', 'ReviewModal.tsx');

describe('ReviewModal blocked state', () => {
  const source = fs.readFileSync(reviewModalPath, 'utf8');

  it('renders a clear blocked state instead of a disabled form when reviews are not allowed', () => {
    expect(source).toContain('!isReviewAllowed && error');
    expect(source).toContain('No se puede enviar la reseña');
    expect(source).toContain('<Button variant="secondary" size="medium" onPress={handleClose}>');
  });
});
