import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const track = db
		.select({ status: tracks.status, errorMessage: tracks.errorMessage })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track) {
		throw error(404, 'Track not found');
	}

	return json({ status: track.status, errorMessage: track.errorMessage });
};
