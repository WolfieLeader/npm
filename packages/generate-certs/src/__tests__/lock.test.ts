import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { threadId } from "node:worker_threads";
import { afterEach, describe, expect, it, vi } from "vitest";
import { $evictStaleLock, $isProcessAlive, $pidNamespace, $withLock } from "../lock.js";

function errno(code: string) {
  return Object.assign(new Error(code), { code });
}

describe("lock", () => {
  let tmpDir: string | undefined;

  afterEach(() => {
    if (tmpDir !== undefined) fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
    vi.restoreAllMocks();
  });

  function lockWith(content: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-lock-"));
    tmpDir = dir;
    const lockPath = path.join(dir, ".generate-certs.lock");
    fs.writeFileSync(lockPath, content);
    return lockPath;
  }

  it("treats EPERM as alive", () => {
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw errno("EPERM");
    });
    expect($isProcessAlive(12_345)).toBe(true);
  });

  it("treats ESRCH as dead", () => {
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw errno("ESRCH");
    });
    expect($isProcessAlive(12_345)).toBe(false);
  });

  it("does not evict a fresh lock whose owner returns EPERM", () => {
    const lockPath = lockWith("12345:token");
    vi.spyOn(process, "kill").mockImplementation(() => {
      throw errno("EPERM");
    });

    expect($evictStaleLock(lockPath)).toBe(false);
    expect(fs.readFileSync(lockPath, "utf8")).toBe("12345:token");
  });

  it("does not evict a fresh lock held by a live process owned by another user (pid 1)", () => {
    const lockPath = lockWith("1");
    expect($evictStaleLock(lockPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  it("evicts a fresh lock naming this PID and thread, left by an earlier process with the same PID", () => {
    const lockPath = lockWith(`${process.pid}:${threadId}:${$pidNamespace()}:old-token`);
    expect($evictStaleLock(lockPath)).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("keeps a fresh lock held by another thread of this process", () => {
    const lockPath = lockWith(`${process.pid}:${threadId + 1}:${$pidNamespace()}:token`);
    expect($evictStaleLock(lockPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
    "waits on a fresh lock it cannot read instead of retrying at once",
    () => {
      const lockPath = lockWith("12345:0:token");
      fs.chmodSync(lockPath, 0o000);
      expect($evictStaleLock(lockPath)).toBe(false);
      expect(fs.existsSync(lockPath)).toBe(true);
    },
  );

  it("keeps a fresh lock from another PID namespace, whose PID means nothing here", () => {
    // PID 999999999 does not exist here, but it may be alive in the other container.
    const lockPath = lockWith(`999999999:0:${$pidNamespace()}1:token`);
    expect($evictStaleLock(lockPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  it("evicts a lock whose owner is gone (ESRCH)", () => {
    const lockPath = lockWith("999999999:token");
    expect($evictStaleLock(lockPath)).toBe(true);
    expect(fs.existsSync(lockPath)).toBe(false);
    expect(fs.readdirSync(path.dirname(lockPath))).toStrictEqual([]);
  });

  it("puts back a fresh lock that replaced the stale one before eviction", () => {
    const lockPath = lockWith("999999999:stale");
    const realRename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementationOnce((from, to) => {
      // Another process evicts the stale lock and takes a fresh one first.
      fs.unlinkSync(lockPath);
      fs.writeFileSync(lockPath, `${process.pid}:fresh`);
      realRename(from, to);
    });

    expect($evictStaleLock(lockPath)).toBe(true);
    expect(fs.readFileSync(lockPath, "utf8")).toBe(`${process.pid}:fresh`);
    expect(fs.readdirSync(path.dirname(lockPath))).toStrictEqual([".generate-certs.lock"]);
  });

  it("puts back a replacement lock that reuses the stale lock's inode", () => {
    const lockPath = lockWith("999999999:stale");
    const realRename = fs.renameSync;
    vi.spyOn(fs, "renameSync").mockImplementationOnce((from, to) => {
      // Same inode, new owner: overwrite in place, as a filesystem that reuses inodes would allow.
      fs.writeFileSync(lockPath, `${process.pid}:fresh`);
      realRename(from, to);
    });

    expect($evictStaleLock(lockPath)).toBe(true);
    expect(fs.readFileSync(lockPath, "utf8")).toBe(`${process.pid}:fresh`);
  });

  it("releases only its own lock", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gen-certs-lock-"));
    tmpDir = dir;
    const lockPath = path.join(dir, ".generate-certs.lock");

    $withLock(dir, () => {
      // Simulate another process that evicted this lock and took its own.
      fs.writeFileSync(lockPath, "4242:other");
    });

    expect(fs.readFileSync(lockPath, "utf8")).toBe("4242:other");
  });
});
