import { fileTypeFromBuffer } from 'file-type';

const SUPPORTED_MIME_TYPES = new Set([
	'audio/mpeg',
	'audio/flac',
	'audio/wav',
	'audio/ogg',
	'audio/aac',
	'audio/x-wav'
]);

export async function validateAudioFile(
	buffer: Buffer
): Promise<{ valid: boolean; mime?: string; error?: string }> {
	const type = await fileTypeFromBuffer(buffer);

	if (!type) {
		return { valid: false, error: 'Unknown file type' };
	}

	if (!SUPPORTED_MIME_TYPES.has(type.mime)) {
		return { valid: false, error: `Unsupported audio format: ${type.mime}` };
	}

	return { valid: true, mime: type.mime };
}
