import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collectionTracks, collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const track = db
		.select()
		.from(tracks)
		.where(eq(tracks.slug, params.slug))
		.get();

	if (!track || track.status !== 'ready') {
		throw error(404, 'Track not found');
	}

	// Fall back to collection art if track has none
	if (!track.artPath) {
		const collectionArt = db.select({
				artPath: collections.artPath,
				dominantColor: collections.dominantColor,
			})
			.from(collectionTracks)
			.innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
			.where(eq(collectionTracks.trackId, track.id))
			.get();
		if (collectionArt?.artPath) {
			track.artPath = collectionArt.artPath;
			track.dominantColor = track.dominantColor ?? collectionArt.dominantColor;
		}
	}

	const trackTagRows = db
		.select({ name: tags.name })
		.from(trackTags)
		.innerJoin(tags, eq(trackTags.tagId, tags.id))
		.where(eq(trackTags.trackId, track.id))
		.all();

	const isAdmin = !!cookies.get('authelia_session');

	return { track, tags: trackTagRows.map((t) => t.name), isAdmin };
};
