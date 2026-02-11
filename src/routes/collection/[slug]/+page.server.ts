import { db } from '$lib/server/db/client';
import { collections, collectionTracks, tracks, tags, trackTags } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const collection = db
		.select()
		.from(collections)
		.where(eq(collections.slug, params.slug))
		.get();

	if (!collection) {
		throw error(404, 'Collection not found');
	}

	const orderedTracks = db
		.select({
			id: tracks.id,
			title: tracks.title,
			slug: tracks.slug,
			duration: tracks.duration,
			artPath: tracks.artPath,
			playCount: tracks.playCount,
			category: tracks.category,
			dominantColor: tracks.dominantColor,
			position: collectionTracks.position,
		})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(and(
			eq(collectionTracks.collectionId, collection.id),
			eq(tracks.status, 'ready'),
		))
		.orderBy(asc(collectionTracks.position))
		.all();

	// Get tags for these tracks
	const trackIds = orderedTracks.map(t => t.id);
	const allTrackTags = trackIds.length > 0
		? db.select({ trackId: trackTags.trackId, name: tags.name })
			.from(trackTags)
			.innerJoin(tags, eq(trackTags.tagId, tags.id))
			.all()
		: [];

	const tagsByTrack = new Map<string, string[]>();
	for (const tt of allTrackTags) {
		if (!tagsByTrack.has(tt.trackId)) tagsByTrack.set(tt.trackId, []);
		tagsByTrack.get(tt.trackId)!.push(tt.name);
	}

	return {
		collection,
		tracks: orderedTracks.map(t => ({
			...t,
			tags: tagsByTrack.get(t.id) ?? [],
		})),
	};
};
