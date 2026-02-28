import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const track = db.select({ id: tracks.id })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track) throw error(404, 'Track not found');

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (body.title !== undefined) {
		const title = String(body.title).trim();
		if (!title) return json({ error: 'Title cannot be empty' }, { status: 400 });
		updates.title = title;
	}

	if (body.category !== undefined) {
		const validCategories = ['track', 'set', 'experiment', 'export'];
		if (!validCategories.includes(body.category)) {
			return json({ error: 'Invalid category' }, { status: 400 });
		}
		updates.category = body.category;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	updates.updatedAt = new Date().toISOString();

	db.update(tracks)
		.set(updates)
		.where(eq(tracks.id, params.id))
		.run();

	return json({ ok: true });
};
