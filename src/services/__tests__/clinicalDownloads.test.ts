import { beginClinicalDownload, cancelClinicalDownloads } from '../clinicalDownloads';

test('a late completion cannot detach a newer download from cancellation', () => {
  const old = beginClinicalDownload('token');
  cancelClinicalDownloads('token');
  expect(old.isActive()).toBe(false);
  const next = beginClinicalDownload('token');
  old.release();
  cancelClinicalDownloads('token');
  expect(next.isActive()).toBe(false);
});

test('locking one access token does not cancel another token', () => {
  const first = beginClinicalDownload('first');
  const second = beginClinicalDownload('second');
  cancelClinicalDownloads('first');
  expect(first.signal.aborted).toBe(true);
  expect(second.signal.aborted).toBe(false);
  first.release(); second.release();
});
