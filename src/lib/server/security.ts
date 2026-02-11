import { resolve } from 'node:path';
import { fileTypeFromBuffer } from 'file-type';

const DATA_ROOT = resolve('/data');

/**
 * Validates that a file path resolves within /data/.
 * Prevents path traversal attacks (e.g., /data/audio/../../etc/passwd).
 */
export function validateDataPath(filePath: string): string {
	const resolved = resolve(filePath);
	if (!resolved.startsWith(DATA_ROOT + '/')) {
		throw new Error('Invalid file path');
	}
	return resolved;
}

const SUPPORTED_IMAGE_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
]);

export async function validateImageBuffer(
	buffer: Buffer
): Promise<{ valid: boolean; mime?: string; error?: string }> {
	const type = await fileTypeFromBuffer(buffer);
	if (!type) {
		return { valid: false, error: 'Unknown file type' };
	}
	if (!SUPPORTED_IMAGE_TYPES.has(type.mime)) {
		return { valid: false, error: `Unsupported image format: ${type.mime}` };
	}
	return { valid: true, mime: type.mime };
}

export const MAX_AUDIO_SIZE = 200 * 1024 * 1024; // 200MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
