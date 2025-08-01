import { generateCertificates } from './generate';
import { isFileExists, readFile } from './utils';

export interface GenerateCertsOptions {
  certsDir: string;
  log?: boolean;
}

export function generateCerts({ certsDir, log = true }: GenerateCertsOptions) {
  const exitingCerts = checkForExistingCerts({ certsDir, log });
  if (exitingCerts) return exitingCerts;
  return generateNewCerts({ certsDir, log });
}

function checkForExistingCerts({ certsDir, log = true }: GenerateCertsOptions) {
  try {
    if (isFileExists(certsDir, 'key.pem') && isFileExists(certsDir, 'cert.pem')) {
      if (log) console.log('🔍 Found existing certificates for HTTPS.');
      return { key: readFile(certsDir, 'key.pem'), cert: readFile(certsDir, 'cert.pem') };
    }
  } catch {
    throw new Error('Error in checking for existing certificates.');
  }
}

function generateNewCerts({ certsDir, log = true }: GenerateCertsOptions) {
  try {
    generateCertificates(certsDir);
    if (log) {
      console.log('🔐 Certificates for HTTPS have been generated successfully!');
      console.log(`🛑 Please visit the URL and click on 'Advanced' and 'Proceed to localhost(unsafe)' to continue.`);
    }
    return { key: readFile(certsDir, 'key.pem'), cert: readFile(certsDir, 'cert.pem') };
  } catch {
    throw new Error('Error in generating new certificates.');
  }
}
