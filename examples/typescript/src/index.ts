import { nodeKit, webKit } from "cipher-kit";
import { compress, compressObj, decompress, decompressObj } from "compress-kit";

function section(title: string) {
  console.log(`\n${"=".repeat(50)}`);
  console.log(` ${title}`);
  console.log("=".repeat(50));
}

// ── cipher-kit (Node) ────────────────────────────

section("cipher-kit — Node crypto");

const nodeKey = nodeKit.createSecretKey("my-32-char-high-entropy-secret!!");
console.log("Secret key created");

const nodeEncrypted = nodeKit.encrypt("Hello from Node crypto!", nodeKey);
console.log("Encrypted:", nodeEncrypted);

const nodeDecrypted = nodeKit.decrypt(nodeEncrypted, nodeKey);
console.log("Decrypted:", nodeDecrypted);

const nodeHashed = nodeKit.hash("hash me");
console.log("Hash:", nodeHashed);

const { result: nodeHashedPw, salt: nodeSalt } = nodeKit.hashPassword("my-password");
console.log("Password hash:", `${nodeHashedPw.slice(0, 32)}...`);
console.log("Salt:", nodeSalt);

const nodeVerified = nodeKit.verifyPassword("my-password", nodeHashedPw, nodeSalt);
console.log("Password verified:", nodeVerified);

const nodeWrong = nodeKit.verifyPassword("wrong-password", nodeHashedPw, nodeSalt);
console.log("Wrong password verified:", nodeWrong);

// ── cipher-kit (Web Crypto API) ──────────────────

section("cipher-kit — Web Crypto API");

const webKey = await webKit.createSecretKey("my-32-char-high-entropy-secret!!");
console.log("Secret key created");

const webEncrypted = await webKit.encrypt("Hello from Web Crypto API!", webKey);
console.log("Encrypted:", webEncrypted);

const webDecrypted = await webKit.decrypt(webEncrypted, webKey);
console.log("Decrypted:", webDecrypted);

const webHashed = await webKit.hash("hash me");
console.log("Hash:", webHashed);

const { result: webHashedPw, salt: webSalt } = await webKit.hashPassword("my-password");
console.log("Password hash:", `${webHashedPw.slice(0, 32)}...`);
console.log("Salt:", webSalt);

const webVerified = await webKit.verifyPassword("my-password", webHashedPw, webSalt);
console.log("Password verified:", webVerified);

const webWrong = await webKit.verifyPassword("wrong-password", webHashedPw, webSalt);
console.log("Wrong password verified:", webWrong);

// ── compress-kit ─────────────────────────────────

section("compress-kit — Strings");

const original = "Hello, compress-kit! ".repeat(20);
console.log("Original length:", original.length);

const compressed = compress(original);
console.log("Compressed:", `${compressed.slice(0, 48)}...`);
console.log("Compressed length:", compressed.length);

const decompressed = decompress(compressed);
console.log("Decompressed matches:", decompressed === original);

section("compress-kit — Objects");

const obj = { name: "Alice", items: [1, 2, 3], nested: { flag: true } };
console.log("Original:", JSON.stringify(obj));

const compressedObj = compressObj(obj);
console.log("Compressed:", `${compressedObj.slice(0, 48)}...`);

const restoredObj = decompressObj<typeof obj>(compressedObj);
console.log("Restored:", JSON.stringify(restoredObj));
console.log("Match:", JSON.stringify(obj) === JSON.stringify(restoredObj));

section("Done");
console.log("All examples completed successfully!");
