import fs from 'node:fs';
import path from 'node:path';

const sessionCardPath = path.join(__dirname, '..', 'SessionCard.tsx');

describe('SessionCard cancellation action', () => {
  const source = fs.readFileSync(sessionCardPath, 'utf8');

  it('hides cancellation once the session end time has passed', () => {
    expect(source).toContain('const isSessionEnded =');
    expect(source).toContain('session.duration * 60 * 1000 <= Date.now()');
    expect(source).toContain('showActions && !isCompleted && !isCancelled && !isSessionEnded');
  });
});
