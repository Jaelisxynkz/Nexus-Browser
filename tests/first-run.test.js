/**
 * Tests for FirstRun — first-launch detection.
 * Verifies the welcome screen appears only for genuinely new installations.
 */
import { FirstRun } from '../desktop/lib/FirstRun.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-firstrun-'));
}

describe('FirstRun', () => {
  let dir, fr;

  beforeEach(() => {
    dir = tempDir();
    fr = new FirstRun(dir);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('is pending on a fresh installation (no marker file)', () => {
    expect(fr.isPending()).toBe(true);
  });

  it('is no longer pending after completion', () => {
    fr.complete();
    expect(fr.isPending()).toBe(false);
  });

  it('stays completed across restarts (marker persists)', () => {
    fr.complete();
    const fr2 = new FirstRun(dir);
    expect(fr2.isPending()).toBe(false);
  });

  it('does not reappear after update (same userData dir)', () => {
    fr.complete();
    const fr2 = new FirstRun(dir);
    expect(fr2.isPending()).toBe(false);
  });

  it('reappears only after an intentional reset', () => {
    fr.complete();
    expect(fr.isPending()).toBe(false);
    fr.reset();
    expect(fr.isPending()).toBe(true);
  });

  it('does not reappear when a new window is created', () => {
    fr.complete();
    const fr2 = new FirstRun(dir);
    expect(fr2.isPending()).toBe(false);
  });
});