import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allTracks = db
		.select({
			id: tracks.id,
			title: tracks.title,
			slug: tracks.slug,
			status: tracks.status,
			category: tracks.category,
			duration: tracks.duration,
			artPath: tracks.artPath,
			dominantColor: tracks.dominantColor,
			errorMessage: tracks.errorMessage,
			createdAt: tracks.createdAt,
			updatedAt: tracks.updatedAt,
		})
		.from(tracks)
		.orderBy(desc(tracks.createdAt))
		.all();

	return { tracks: allTracks };
};
