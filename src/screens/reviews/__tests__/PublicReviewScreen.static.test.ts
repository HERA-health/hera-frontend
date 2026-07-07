import fs from 'node:fs';
import path from 'node:path';

const publicReviewScreenPath = path.join(__dirname, '..', 'PublicReviewScreen.tsx');

describe('PublicReviewScreen public invitation errors', () => {
  const source = fs.readFileSync(publicReviewScreenPath, 'utf8');

  it('treats already submitted public reviews as a completed state', () => {
    expect(source).toContain("getErrorCode(submitError) === 'ALREADY_SUBMITTED'");
    expect(source).toContain('setSubmitted(true)');
    expect(source).toContain("status: 'SUBMITTED'");
    expect(source).toContain('Gracias por tu reseña');
  });
});
