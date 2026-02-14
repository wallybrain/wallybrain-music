import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks, collectionTracks } from '$lib/server/db/schema';
import { like, eq, and, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() || '';
	const excludeCollection = url.searchParams.get('exclude') || '';

	if (q.length < 1) {
		return json([]);
	}

	let excludeTrackIds: string[] = [];
	if (excludeCollection) {
		excludeTrackIds = db.select({ trackId: collectionTracks.trackId })
			.from(collectionTracks)
			.where(eq(collectionTracks.collectionId, excludeCollection))
			.all()
			.map(r => r.trackId);
	}

	const conditions = [
		like(tracks.title, `%${q}%`),
		eq(tracks.status, 'ready'),
	];

	if (excludeTrackIds.length > 0) {
		conditions.push(sql`${tracks.id} NOT IN (${sql.join(excludeTrackIds.map(id => sql`${id}`), sql`, `)})`);
	}

	const results = db.select({
		id: tracks.id,
		title: tracks.title,
		duration: tracks.duration,
		artPath: tracks.artPath,
	})
		.from(tracks)
		.where(and(...conditions))
		.limit(10)
		.all();

	return json(results);
};
