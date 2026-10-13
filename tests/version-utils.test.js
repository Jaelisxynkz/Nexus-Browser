/**
 * Tests for version comparison (used by the auto-updater).
 */
import { parseVersion, compareVersions, isNewer, isSame } from '../desktop/lib/version-utils.js';

describe('parseVersion', () => {
  it('parses standard semver', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3, 0]);
  });

  it('parses four-part versions', () => {
    expect(parseVersion('1.2.3.4')).toEqual([1, 2, 3, 4]);
  });

  it('handles v prefix', () => {
    expect(parseVersion('v2.0.0')).toEqual([2, 0, 0, 0]);
  });

  it('handles prerelease suffixes', () => {
    expect(parseVersion('1.0.0-beta.1')).toEqual([1, 0, 0, 0]);
  });

  it('returns zeros for invalid input', () => {
    expect(parseVersion('')).toEqual([0, 0, 0, 0]);
    expect(parseVersion(null)).toEqual([0, 0, 0, 0]);
    expect(parseVersion('notaversion')).toEqual([0, 0, 0, 0]);
  });
});

describe('compareVersions', () => {
  it('compares major versions', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('compares minor versions', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
  });

  it('compares patch versions', () => {
    expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
  });

  it('compares build numbers', () => {
    expect(compareVersions('1.0.0.2', '1.0.0.1')).toBe(1);
    expect(compareVersions('1.0.0.1', '1.0.0.2')).toBe(-1);
  });

  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
  });
});

describe('isNewer', () => {
  it('detects newer versions', () => {
    expect(isNewer('1.1.0', '1.0.0')).toBe(true);
    expect(isNewer('2.0.0', '1.9.9')).toBe(true);
  });

  it('rejects older versions (no downgrade)', () => {
    expect(isNewer('1.0.0', '1.1.0')).toBe(false);
    expect(isNewer('0.9.0', '1.0.0')).toBe(false);
  });

  it('rejects same versions (no repeated update)', () => {
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('isSame', () => {
  it('detects same versions', () => {
    expect(isSame('1.0.0', '1.0.0')).toBe(true);
    expect(isSame('1.2.3', '1.2.3')).toBe(true);
  });
  it('detects different versions', () => {
    expect(isSame('1.0.0', '1.0.1')).toBe(false);
  });
});