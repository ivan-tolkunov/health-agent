import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
	const encoded = process.env.TOKEN_ENCRYPTION_KEY;
	if (!encoded) {
		throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
	}

	const key = Buffer.from(encoded, "base64");
	if (key.length !== 32) {
		throw new Error(
			"TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
		);
	}

	return key;
}

export function encryptSecret(value: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
	const encrypted = Buffer.concat([
		cipher.update(value, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();

	return [iv, tag, encrypted]
		.map((part) => part.toString("base64url"))
		.join(".");
}

export function decryptSecret(value: string): string {
	const parts = value.split(".");
	if (parts.length !== 3) {
		throw new Error("Stored secret has an invalid format");
	}

	const [iv, tag, encrypted] = parts.map((part) =>
		Buffer.from(part, "base64url"),
	);
	const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
	decipher.setAuthTag(tag);

	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
		"utf8",
	);
}
