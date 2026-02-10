import sharp from 'sharp';

export async function extractAndResizeArt(
	coverBuffer: Buffer,
	outputPath: string
): Promise<void> {
	try {
		await sharp(coverBuffer)
			.resize(500, 500, { fit: 'cover' })
			.jpeg({ quality: 85 })
			.toFile(outputPath);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new Error(`Cover art processing failed: ${message}`);
	}
}

export async function extractDominantColor(imagePath: string): Promise<string> {
	const { dominant } = await sharp(imagePath).stats();
	const { r, g, b } = dominant;
	const hex = (n: number) => n.toString(16).padStart(2, '0');
	return `#${hex(r)}${hex(g)}${hex(b)}`;
}
