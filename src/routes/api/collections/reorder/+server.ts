import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request }) => {
	const { positions } = await request.json();

	if (!Array.isArray(positions)) {
		return json({ error: 'positions must be an array of {id, position}' }, { status: 400 });
	}

	for (const { id, position } of positions) {
		db.update(collections)
			.set({ sortOrder: position })
			.where(eq(collections.id, id))
			.run();
	}

	return json({ ok: true });
};
