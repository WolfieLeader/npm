import fs from 'node:fs';
import path from 'node:path';

export function isFileExists(dir: string, fileName: string) {
  return fs.existsSync(path.join(dir, fileName));
}

export function readFile(dir: string, fileName: string) {
  if (!isFileExists(dir, fileName)) throw new Error(`"${fileName}" not found.`);
  return fs.readFileSync(path.join(dir, fileName), 'utf8');
}
