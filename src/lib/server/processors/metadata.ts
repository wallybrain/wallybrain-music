import { parseFile, selectCover } from 'music-metadata';

export async function extractMetadata(
	filepath: string
): Promise<{ title?: string; artist?: string; album?: string; coverArt: Buffer | null }> {
	const metadata = await parseFile(filepath);

	const cover = selectCover(metadata.common.picture);

	return {
		title: metadata.common.title,
		artist: metadata.common.artist,
		album: metadata.common.album,
		coverArt: cover ? Buffer.from(cover.data) : null
	};
}
