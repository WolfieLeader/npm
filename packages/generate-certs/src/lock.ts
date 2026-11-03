import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { threadId } from "node:worker_threads";
import { $errorCode } from "./error-code.js";

const LOCK_FILE = ".generate-certs.lock";
const LOCK_STALE_MS = 60_000;
const LOCK_RETRY_DELAY_MS = 200;
// Wait past the stale age, so a lock whose owner cannot be checked (no PID, or a PID this user may not signal)
// ages out and is evicted instead of failing the call.
const LOCK_MAX_RETRIES = LOCK_STALE_MS / LOCK_RETRY_DELAY_MS + 10;

function $syncSleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The PID namespace on Linux (`pid:[4026531836]` becomes `4026531836`), or `""` where there is none to read.
 * A PID is only meaningful inside its namespace, so a lock from another container is never judged by its PID.
 */
export function $pidNamespace(): string {
  try {
    return fs.readlinkSync("/proc/self/ns/pid").replaceAll(/\D/g, "");
  } catch {
    return "";
  }
}

/** Reports whether `pid` is alive. Only `ESRCH` means dead; `EPERM` means alive but owned by another user. */
export function $isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return $errorCode(error) !== "ESRCH";
  }
}

interface LockIdentity {
  ino: number;
  mtimeMs: number;
  /** `null` when the lock exists but this user cannot read it. */
  content: string | null;
}

/** Identifies a lock this user cannot open by its inode and age alone, or `null` when it vanished. */
function $identifyUnopened(lockPath: string): LockIdentity | null {
  try {
    const { ino, mtimeMs } = fs.statSync(lockPath);
    return { ino, mtimeMs, content: null };
  } catch {
    return null;
  }
}

function $identifyOpened(fd: number): LockIdentity {
  const { ino, mtimeMs } = fs.fstatSync(fd);
  try {
    return { ino, mtimeMs, content: fs.readFileSync(fd, "utf8") };
  } catch {
    // Open but not readable as a file, such as a directory.
    return { ino, mtimeMs, content: null };
  }
}

/**
 * Reads the lock's inode, age and content through one file descriptor, so all three describe the same file even
 * when another process replaces the lock meanwhile. Returns `null` when the lock vanished.
 */
function $identify(lockPath: string): LockIdentity | null {
  let fd: number;
  try {
    fd = fs.openSync(lockPath, "r");
  } catch (error) {
    return $errorCode(error) === "ENOENT" ? null : $identifyUnopened(lockPath);
  }
  try {
    return $identifyOpened(fd);
  } catch {
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

/** True when the owner named in `content` (`pid:thread:namespace:token`) is known to be gone. */
function $isOwnerGone(content: string): boolean {
  const [pidText = "", threadText = "", namespace = ""] = content.split(":");
  const pid = Number.parseInt(pidText, 10);
  if (!Number.isInteger(pid) || pid <= 0) return false;
  // Another PID namespace (another container on a shared volume): its PID says nothing here, so wait for the stale age.
  // A lock without a namespace field (written by 3.x) is judged by its PID, as before.
  if (namespace !== "" && namespace !== $pidNamespace()) return false;
  // This thread holds no lock while it waits for one, so a lock naming this PID and thread was left by an
  // earlier process that had the same PID, such as a restarted container's PID 1.
  if (pid === process.pid && threadText === String(threadId)) return true;
  return !$isProcessAlive(pid);
}

function $isStale(lock: LockIdentity): boolean {
  if (Date.now() - lock.mtimeMs > LOCK_STALE_MS) return true;
  return lock.content !== null && $isOwnerGone(lock.content);
}

function $unlinkQuietly(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Already gone or not removable: either way there is nothing left to do.
  }
}

/**
 * Removes a stale lock. Returns `true` when the caller should retry at once.
 *
 * The lock is renamed before deletion, so only one process can claim a given lock file.
 * If the renamed file is not the one judged stale (inode or content differ: another process
 * replaced it in between), it is linked back into place.
 */
export function $evictStaleLock(lockPath: string): boolean {
  const lock = $identify(lockPath);
  if (!lock) return true;
  if (!$isStale(lock)) return false;

  const tombstone = `${lockPath}.${randomUUID()}.stale`;
  try {
    fs.renameSync(lockPath, tombstone);
  } catch {
    return true;
  }

  const claimed = $identify(tombstone);
  if (claimed?.ino !== lock.ino || claimed.content !== lock.content) {
    try {
      fs.linkSync(tombstone, lockPath);
    } catch {
      // Best effort: another lock already took the path, or the file system has no hard links.
    }
  }
  $unlinkQuietly(tombstone);
  return true;
}

function $tryAcquire(lockPath: string, owner: string): boolean {
  try {
    fs.writeFileSync(lockPath, owner, { flag: "wx" });
    return true;
  } catch (error) {
    if ($errorCode(error) === "EEXIST") return false;
    throw error;
  }
}

/** Removes the lock only if it still holds this caller's owner tag. */
function $release(lockPath: string, owner: string): void {
  try {
    if (fs.readFileSync(lockPath, "utf8") === owner) fs.unlinkSync(lockPath);
  } catch {
    // Best effort: a lock left behind turns stale and the next caller evicts it.
  }
}

/** Runs `fn` while holding an exclusive lock file in `dir`. Throws when the lock cannot be acquired. */
export function $withLock<T>(dir: string, fn: () => T): T {
  const lockPath = path.join(dir, LOCK_FILE);
  // PID, thread and PID namespace come first so other callers can check whether the owner is alive.
  const owner = `${process.pid}:${threadId}:${$pidNamespace()}:${randomUUID()}`;

  for (let attempt = 0; attempt < LOCK_MAX_RETRIES; attempt++) {
    if ($tryAcquire(lockPath, owner)) {
      try {
        return fn();
      } finally {
        $release(lockPath, owner);
      }
    }
    if (!$evictStaleLock(lockPath) && attempt < LOCK_MAX_RETRIES - 1) $syncSleep(LOCK_RETRY_DELAY_MS);
  }

  throw new Error(
    `Error generating certificates: could not acquire ${lockPath}. Delete it if no generate-certs process is running.`,
  );
}
