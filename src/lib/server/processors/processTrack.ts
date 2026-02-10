import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { validateWithFFprobe } from '$lib/server/validators/ffprobe';
import { transcodeAudio } from '$lib/server/processors/transcode';
import { generatePeaks } from '$lib/server/processors/peaks';
import { extractMetadata } from '$lib/server/processors/metadata';
import { extractAndResizeArt, extractDominantColor } from '$lib/server/processors/artwork';
import { mkdirSync, existsSync } from 'node:fs';

export async function processTrack(trackId: string): Promise<void> {
	try {
		db.update(tracks)
			.set({ status: 'processing', updatedAt: new Date().toISOString() })
			.where(eq(tracks.id, trackId))
			.run();

		const track = db.select().from(tracks).where(eq(tracks.id, trackId)).get();
		if (!track) {
			throw new Error(`Track ${trackId} not found in database`);
		}

		const probeResult = await validateWithFFprobe(track.audioPath);
		if (!probeResult.valid) {
			throw new Error(`FFprobe validation failed: ${probeResult.error}`);
		}

		for (const dir of ['/data/audio', '/data/peaks', '/data/art']) {
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
		}

		const mp3Path = `/data/audio/${trackId}.mp3`;
		const peaksPath = `/data/peaks/${trackId}.json`;
		const artPath = `/data/art/${trackId}.jpg`;

		await transcodeAudio(track.audioPath, mp3Path);
		await generatePeaks(mp3Path, peaksPath);

		const metadata = await extractMetadata(track.audioPath);

		let artSucceeded = false;
		let dominantColor: string | null = null;
		if (metadata.coverArt) {
			try {
				await extractAndResizeArt(metadata.coverArt, artPath);
				artSucceeded = true;
				dominantColor = await extractDominantColor(artPath);
			} catch (err) {
				console.error(`Cover art extraction failed for track ${trackId}:`, err);
			}
		}

		db.update(tracks)
			.set({
				status: 'ready',
				audioPath: mp3Path,
				peaksPath,
				duration: probeResult.duration,
				bitrate: 320000,
				title: metadata.title || track.title,
				...(artSucceeded ? { artPath } : {}),
				...(dominantColor ? { dominantColor } : {}),
				updatedAt: new Date().toISOString()
			})
			.where(eq(tracks.id, trackId))
			.run();

		console.log(`Track ${trackId} processed successfully`);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`Processing failed for track ${trackId}:`, message);

		db.update(tracks)
			.set({
				status: 'failed',
				errorMessage: message,
				updatedAt: new Date().toISOString()
			})
			.where(eq(tracks.id, trackId))
			.run();
	}
}
