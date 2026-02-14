import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { tracks, collections, collectionTracks } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';
import { validateWithFFprobe } from '$lib/server/validators/ffprobe';
import { transcodeAudio } from '$lib/server/processors/transcode';
import { generatePeaks } from '$lib/server/processors/peaks';
import { extractMetadata } from '$lib/server/processors/metadata';
import { extractAndResizeArt, extractDominantColor } from '$lib/server/processors/artwork';
import { mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { validateDataPath } from '$lib/server/security';

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

		validateDataPath(track.audioPath);

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

		// Update collection aggregates if track belongs to any collections
		const memberOf = db.select({ collectionId: collectionTracks.collectionId })
			.from(collectionTracks)
			.where(eq(collectionTracks.trackId, trackId))
			.all();

		for (const { collectionId: cid } of memberOf) {
			const agg = db.select({
				count: sql<number>`count(*)`,
				totalDur: sql<number>`coalesce(sum(${tracks.duration}), 0)`,
			})
				.from(collectionTracks)
				.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
				.where(eq(collectionTracks.collectionId, cid))
				.get();

			db.update(collections)
				.set({
					trackCount: agg?.count ?? 0,
					totalDuration: agg?.totalDur ?? 0,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(collections.id, cid))
				.run();
		}

		// Auto-create a "single" collection if track isn't in any collection
		const membership = db.select({ collectionId: collectionTracks.collectionId })
			.from(collectionTracks)
			.where(eq(collectionTracks.trackId, trackId))
			.get();

		if (!membership) {
			const freshTrack = db.select().from(tracks).where(eq(tracks.id, trackId)).get();
			if (freshTrack) {
				const singleId = randomUUID();
				let singleSlug = freshTrack.slug;

				// Insert single collection with slug collision retry
				for (let attempt = 0; attempt < 10; attempt++) {
					try {
						db.insert(collections).values({
							id: singleId,
							slug: singleSlug,
							title: freshTrack.title,
							type: 'single',
							trackCount: 1,
							totalDuration: freshTrack.duration ?? 0,
							artPath: freshTrack.artPath ?? null,
							dominantColor: freshTrack.dominantColor ?? null,
						}).run();
						break;
					} catch (err) {
						const msg = err instanceof Error ? err.message : String(err);
						if (msg.includes('UNIQUE constraint') && msg.includes('slug')) {
							singleSlug = `${freshTrack.slug}-${attempt + 2}`;
							continue;
						}
						throw err;
					}
				}

				// Copy track art to collection art path if it exists
				if (freshTrack.artPath && existsSync(freshTrack.artPath)) {
					const collectionArtDir = '/data/art/collections';
					if (!existsSync(collectionArtDir)) mkdirSync(collectionArtDir, { recursive: true });
					const collectionArtPath = `${collectionArtDir}/${singleId}.jpg`;
					copyFileSync(freshTrack.artPath, collectionArtPath);
					db.update(collections)
						.set({ artPath: collectionArtPath })
						.where(eq(collections.id, singleId))
						.run();
				}

				// Link track to collection
				db.insert(collectionTracks).values({
					collectionId: singleId,
					trackId,
					position: 0,
				}).run();

				console.log(`Auto-created single collection "${freshTrack.title}" for track ${trackId}`);
			}
		}

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
