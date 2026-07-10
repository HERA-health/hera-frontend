import fs from 'node:fs';
import path from 'node:path';

const sessionCardPath = path.join(__dirname, '..', 'SessionCard.tsx');

describe('SessionCard cancellation action', () => {
  const source = fs.readFileSync(sessionCardPath, 'utf8');

  it('uses the explicit patient cancellation rule before rendering the action', () => {
    expect(source).toContain('const canCancel = canClientCancelSession(session);');
    expect(source).toContain('showActions && canCancel && onCancelPress');
  });

  it('spells review actions correctly in Spanish', () => {
    expect(source).toContain('Dejar reseña');
    expect(source).toContain('Reseña enviada');
    expect(source).not.toContain('resena');
  });
});
