import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags } from '$lib/server/db/schema';
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

	const trackTagRows = db
		.select({ name: tags.name })
		.from(trackTags)
		.innerJoin(tags, eq(trackTags.tagId, tags.id))
		.where(eq(trackTags.trackId, track.id))
		.all();

	const isAdmin = !!cookies.get('authelia_session');

	return { track, tags: trackTagRows.map((t) => t.name), isAdmin };
};
