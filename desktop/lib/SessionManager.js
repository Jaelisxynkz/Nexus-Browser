/**
 * SessionManager — Electron session/partition management.
 *
 * The normal browsing session uses the default (persistent) session.
 * Each incognito window gets its own ephemeral session partition:
 *
 *   persist:nexus-normal      — persistent, survives restarts
 *   incognito:<uuid>          — in-memory only, cleared when the last
 *                               window referencing it closes
 *
 * Incognito sessions have:
 *   - Separate cookies, localStorage, sessionStorage, IndexedDB, cache
 *   - No history persistence (we never write to the history DB)
 *   - No form-data persistence
 *   - `persist: false` so storage is in-memory and vanishes on close
 *
 * When the last BrowserView referencing an incognito partition is destroyed,
 * we explicitly clear the session storage to guarantee no residue.
 */

'use strict';

const { session } = require('electron');
const crypto = require('crypto');

const NORMAL_PARTITION = 'persist:nexus-normal';

class SessionManager {
  constructor() {
    // Map<partition, Set<viewId>> — track which views use which partition.
    this._refs = new Map();
    // Set of active incognito partition names.
    this._incognitoPartitions = new Set();
  }

  /**
   * Get (or create) the session for a given partition.
   * For normal browsing, returns the persistent default session.
   * For incognito, returns an ephemeral in-memory session.
   */
  get(partition) {
    if (!partition || partition === NORMAL_PARTITION) {
      return session.fromPartition(NORMAL_PARTITION, { persist: true });
    }
    // Incognito: persist:false → in-memory, no disk writes.
    const ses = session.fromPartition(partition, { persist: false });
    this._incognitoPartitions.add(partition);
    return ses;
  }

  /** Create a new unique incognito partition name. */
  createIncognitoPartition() {
    return 'incognito:' + crypto.randomUUID();
  }

  /** Get the normal (persistent) session. */
  getNormal() {
    return this.get(NORMAL_PARTITION);
  }

  /** Reference-count a partition so we know when it's safe to destroy. */
  acquire(partition, viewId) {
    if (!this._refs.has(partition)) this._refs.set(partition, new Set());
    this._refs.get(partition).add(viewId);
  }

  /**
   * Release a partition reference. When the last view using an incognito
   * partition is released, we clear all its storage and destroy the session
   * data to guarantee no residue survives.
   */
  release(partition, viewId) {
    const refs = this._refs.get(partition);
    if (!refs) return;
    refs.delete(viewId);
    if (refs.size === 0) {
      this._refs.delete(partition);
      if (this._incognitoPartitions.has(partition)) {
        this._destroyIncognito(partition);
      }
    }
  }

  /**
   * Clear all storage for an incognito partition and remove it from the
   * active set. This is the critical privacy guarantee: when the last
   * incognito tab/window closes, all its data is destroyed.
   */
  async _destroyIncognito(partition) {
    try {
      const ses = session.fromPartition(partition, { persist: false });
      await ses.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage',
                   'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
      });
      await ses.clearCache();
      await ses.clearHostResolverCache();
      await ses.clearAuthCache();
      await ses.clearStorageData(); // nuclear: everything remaining
    } catch (e) {
      console.error('[SessionManager] Failed to clear incognito partition:', e.message);
    }
    this._incognitoPartitions.delete(partition);
  }

  /** True if the partition is an incognito (ephemeral) session. */
  isIncognito(partition) {
    return this._incognitoPartitions.has(partition);
  }

  /** List all active incognito partitions (for diagnostics). */
  listIncognito() {
    return [...this._incognitoPartitions];
  }

  /** Destroy ALL incognito sessions immediately (e.g. on app quit). */
  async destroyAllIncognito() {
    const all = [...this._incognitoPartitions];
    await Promise.all(all.map((p) => this._destroyIncognito(p)));
  }
}

module.exports = { SessionManager, NORMAL_PARTITION };