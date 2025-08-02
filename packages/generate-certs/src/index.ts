import fs from 'node:fs';
import path from 'node:path';
import { $generateCerts } from './generate';

export interface GenerateCertsOptions {
  certsDir: string;
  log?: boolean;
}

export function generateCerts({ certsDir, log = true }: GenerateCertsOptions) {
  const exitingCerts = $checkForExistingCerts({ certsDir, log });
  if (exitingCerts) return exitingCerts;
  try {
    $generateCerts(certsDir);
    if (log) {
      console.log('🔐 Certificates for HTTPS have been generated successfully!');
      console.log(`🛑 Please visit the URL and click on 'Advanced' and 'Proceed to localhost(unsafe)' to continue.`);
    }
    return { key: $readFile(certsDir, 'key.pem'), cert: $readFile(certsDir, 'cert.pem') };
  } catch {
    throw new Error('Error in generating new certificates.');
  }
}

function $checkForExistingCerts({ certsDir, log = true }: GenerateCertsOptions) {
  try {
    if ($isFileExists(certsDir, 'key.pem') && $isFileExists(certsDir, 'cert.pem')) {
      if (log) console.log('🔍 Found existing certificates for HTTPS.');
      return { key: $readFile(certsDir, 'key.pem'), cert: $readFile(certsDir, 'cert.pem') };
    }
  } catch {
    throw new Error('Error in checking for existing certificates.');
  }
}

export function $isFileExists(dir: string, fileName: string) {
  return fs.existsSync(path.join(dir, fileName));
}

export function $readFile(dir: string, fileName: string) {
  if (!$isFileExists(dir, fileName)) throw new Error(`"${fileName}" not found.`);
  return fs.readFileSync(path.join(dir, fileName), 'utf8');
}
