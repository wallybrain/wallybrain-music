import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collectionTracks, collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const track = db
		.select({
			id: tracks.id,
			slug: tracks.slug,
			title: tracks.title,
			description: tracks.description,
			duration: tracks.duration,
			category: tracks.category,
			status: tracks.status,
			playCount: tracks.playCount,
			artPath: tracks.artPath,
			dominantColor: tracks.dominantColor,
			createdAt: tracks.createdAt,
		})
		.from(tracks)
		.where(eq(tracks.slug, params.slug))
		.get();

	if (!track || track.status !== 'ready') {
		throw error(404, 'Track not found');
	}

	// Fall back to collection art if track has none
	let hasArt = !!track.artPath;
	if (!hasArt) {
		const collectionArt = db.select({
				artPath: collections.artPath,
				dominantColor: collections.dominantColor,
			})
			.from(collectionTracks)
			.innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
			.where(eq(collectionTracks.trackId, track.id))
			.get();
		if (collectionArt?.artPath) {
			hasArt = true;
			track.dominantColor = track.dominantColor ?? collectionArt.dominantColor;
		}
	}

	const trackTagRows = db
		.select({ name: tags.name })
		.from(trackTags)
		.innerJoin(tags, eq(trackTags.tagId, tags.id))
		.where(eq(trackTags.trackId, track.id))
		.all();

	// Fetch album info for structured data
	const album = db.select({
			title: collections.title,
			slug: collections.slug,
		})
		.from(collectionTracks)
		.innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
		.where(eq(collectionTracks.trackId, track.id))
		.get();

	const isAdmin = !!cookies.get('authelia_session');

	const { artPath: _artPath, status: _status, ...publicTrack } = track;
	return {
		track: { ...publicTrack, hasArt },
		tags: trackTagRows.map((t) => t.name),
		isAdmin,
		album: album ?? null,
	};
};
