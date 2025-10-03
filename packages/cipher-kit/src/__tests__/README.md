# Cipher Kit Tests

This directory contains comprehensive test suites for the `cipher-kit` package, organized by functionality and covering both success and error scenarios across Node.js and Web (Browser) platforms.

## Test Organization

The tests are organized into separate files for better maintainability and clarity:

### 1. **`secret-key.test.ts`** - Secret Key Creation & Validation
Tests for creating and validating `SecretKey` objects used for encryption/decryption.

**Success Cases:**
- Create secret keys with default options (AES-256-GCM)
- Create secret keys with AES-128-GCM algorithm
- Create secret keys with custom salt and info parameters
- Validate proper secret key types (Node vs Web)

**Error Cases:**
- Empty or whitespace-only secrets
- Invalid data types (null, undefined, numbers)
- Too short salt values (< 8 characters)
- Cross-platform consistency checks

### 2. **`encryption.test.ts`** - String Encryption & Decryption
Tests for encrypting and decrypting plain text strings.

**Success Cases:**
- Encrypt/decrypt with default encoding (base64url)
- Encrypt/decrypt with different encodings (hex, base64, base64url)
- Verify each encryption produces unique ciphertext (due to random IV)
- Pattern matching for platform-specific formats

**Error Cases:**
- Empty data for encryption
- Invalid or wrong platform keys
- Invalid key objects or types
- Corrupted ciphertext
- Wrong decryption keys
- Invalid ciphertext formats
- Tampered authentication tags
- Wrong encoding specified for decryption

### 3. **`object-encryption.test.ts`** - Object Encryption & Decryption
Tests for encrypting and decrypting JavaScript objects.

**Success Cases:**
- Encrypt/decrypt simple objects
- Encrypt/decrypt large/complex nested objects
- Handle objects with null values
- Different encoding options (base64, hex)

**Error Cases:**
- Non-object inputs (strings, numbers, null, arrays)
- Invalid keys
- Corrupted ciphertext
- Wrong decryption keys
- Invalid JSON in decrypted data (when string is encrypted but decrypted as object)
- Empty ciphertext

### 4. **`hash-encoding.test.ts`** - Hashing & Encoding Utilities
Tests for hashing data and converting between different encodings.

**Hashing Success Cases:**
- Hash with SHA-256, SHA-384, SHA-512 algorithms
- Different output encodings (hex, base64, base64url)
- Deterministic hashing (same input = same hash)
- Cross-platform consistency

**Hashing Error Cases:**
- Empty or whitespace-only input
- Invalid data types (null, undefined, numbers)

**Encoding Success Cases:**
- Convert between UTF-8, Base64, Hex, Base64URL, Latin1
- Round-trip conversions (UTF-8 → Base64 → UTF-8)
- Cross-platform consistency

### 5. **`password.test.ts`** - Password Hashing & Verification
Tests for securely hashing and verifying passwords using PBKDF2.

**Success Cases:**
- Hash passwords with automatic salt generation
- Verify correct passwords
- Reject incorrect passwords
- Different salts produce different hashes (even for same password)
- Custom iterations, digest algorithms, and encodings
- High-iteration counts for security

**Error Cases:**
- Empty or whitespace-only passwords
- Invalid data types (null, undefined, numbers)
- Too few iterations (< 1000)
- Wrong passwords during verification
- Empty hash or salt
- Corrupted hash or salt
- Mismatched iterations or digest algorithms

### 6. **`encrypt.test.ts`** - Integration Tests
End-to-end integration tests covering complete workflows combining multiple features.

**Workflows:**
- Full encryption workflow with default options
- Full encryption workflow with AES-128-GCM and different encodings
- Encoding conversion consistency between Node and Web
- Hash consistency across platforms
- Complete password hashing and verification workflow

## Test Structure

Each test file follows a consistent structure:

```typescript
describe("Feature Category - Success Cases", () => {
  test("Node: Test description", () => { /* ... */ });
  test("Web: Test description", async () => { /* ... */ });
});

describe("Feature Category - Error Cases", () => {
  test("Node: Fail with [condition]", () => { /* ... */ });
  test("Web: Fail with [condition]", async () => { /* ... */ });
});

describe("Feature Category - Error Consistency", () => {
  test("Node and Web return similar errors for [condition]", async () => { /* ... */ });
});
```

## Platform Coverage

All tests are duplicated for both platforms to ensure consistency:

- **Node.js** - Uses Node.js crypto module (`nodeKit`)
- **Web** - Uses Web Crypto API (`webKit`)

The error consistency tests verify that both platforms handle errors similarly, though exact error messages may differ slightly (e.g., "Crypto NodeJS API" vs "Crypto Web API" prefix).

## Error Testing Principles

### 1. **Input Validation**
- Empty strings
- Whitespace-only strings
- Invalid data types (null, undefined, numbers, objects, arrays)
- Out-of-range values (short salts, low iteration counts)

### 2. **Cryptographic Integrity**
- Corrupted ciphertext
- Tampered authentication tags
- Wrong decryption keys
- Mismatched encryption/decryption parameters

### 3. **Cross-Platform Consistency**
- Verify both platforms return similar error types
- Ensure error messages contain expected keywords
- Validate that both platforms reject the same invalid inputs

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run specific test file
pnpm test secret-key.test.ts

# Run with coverage
pnpm test --coverage
```

## Test Statistics

- **Total Test Files:** 6
- **Total Tests:** 350+
- **Success Case Tests:** ~175
- **Error Case Tests:** ~150
- **Integration Tests:** ~25
- **Platforms Covered:** 2 (Node.js & Web)

## Contributing

When adding new features to cipher-kit:

1. Create new test file if introducing a new major feature
2. Add both success and error cases
3. Test on both Node.js and Web platforms
4. Include error consistency checks
5. Follow the existing test structure and naming conventions
6. Ensure tests are deterministic and don't depend on external factors
