import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ params }) => {
	const track = db
		.select({ id: tracks.id })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track) {
		throw error(404, 'Track not found');
	}

	db.update(tracks)
		.set({ playCount: sql`${tracks.playCount} + 1` })
		.where(eq(tracks.id, params.id))
		.run();

	return new Response(null, { status: 204 });
};
