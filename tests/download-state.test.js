/**
 * Tests for download state transitions.
 * Tests the state machine logic without Electron dependencies.
 */

/**
 * Pure state-machine for download lifecycle.
 * Mirrors the logic in DownloadManager.handleDownload.
 */
function createDownloadState(filename, totalBytes, incognito = false) {
  return {
    id: 1,
    filename,
    totalBytes,
    receivedBytes: 0,
    state: 'active',
    incognito,
    startedAt: new Date().toISOString(),
  };
}

function transition(state, event, payload = {}) {
  switch (event) {
    case 'progress':
      return { ...state, state: 'active', receivedBytes: payload.receivedBytes || state.receivedBytes };
    case 'interrupted':
      return { ...state, state: 'interrupted' };
    case 'completed':
      return { ...state, state: 'completed', receivedBytes: state.totalBytes || state.receivedBytes };
    case 'cancelled':
      return { ...state, state: 'cancelled' };
    default:
      return state;
  }
}

describe('Download state machine', () => {
  it('starts in active state', () => {
    const dl = createDownloadState('file.zip', 1024);
    expect(dl.state).toBe('active');
    expect(dl.receivedBytes).toBe(0);
  });

  it('progress updates receivedBytes and stays active', () => {
    let dl = createDownloadState('file.zip', 1024);
    dl = transition(dl, 'progress', { receivedBytes: 512 });
    expect(dl.state).toBe('active');
    expect(dl.receivedBytes).toBe(512);
  });

  it('completes with full bytes', () => {
    let dl = createDownloadState('file.zip', 1024);
    dl = transition(dl, 'progress', { receivedBytes: 1024 });
    dl = transition(dl, 'completed');
    expect(dl.state).toBe('completed');
    expect(dl.receivedBytes).toBe(1024);
  });

  it('can be interrupted', () => {
    let dl = createDownloadState('file.zip', 1024);
    dl = transition(dl, 'progress', { receivedBytes: 256 });
    dl = transition(dl, 'interrupted');
    expect(dl.state).toBe('interrupted');
  });

  it('can be cancelled', () => {
    let dl = createDownloadState('file.zip', 1024);
    dl = transition(dl, 'cancelled');
    expect(dl.state).toBe('cancelled');
  });

  it('tracks incognito flag', () => {
    const dl = createDownloadState('private.zip', 512, true);
    expect(dl.incognito).toBe(true);
  });

  it('normal download is not incognito', () => {
    const dl = createDownloadState('normal.zip', 512, false);
    expect(dl.incognito).toBe(false);
  });

  it('progress percentage can be computed from state', () => {
    let dl = createDownloadState('file.zip', 1000);
    dl = transition(dl, 'progress', { receivedBytes: 250 });
    const pct = dl.totalBytes > 0 ? (dl.receivedBytes / dl.totalBytes) * 100 : 0;
    expect(pct).toBe(25);
  });

  it('zero-byte download completes without progress', () => {
    let dl = createDownloadState('empty.txt', 0);
    dl = transition(dl, 'completed');
    expect(dl.state).toBe('completed');
    expect(dl.receivedBytes).toBe(0);
  });
});