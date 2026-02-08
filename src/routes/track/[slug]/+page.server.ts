import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const track = db
		.select()
		.from(tracks)
		.where(eq(tracks.slug, params.slug))
		.get();

	if (!track || track.status !== 'ready') {
		throw error(404, 'Track not found');
	}

	return { track };
};
