import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) throw error(404, 'Collection not found');

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (body.title !== undefined) {
		const title = String(body.title).trim();
		if (!title) return json({ error: 'Title cannot be empty' }, { status: 400 });
		updates.title = title;
	}

	if (body.description !== undefined) {
		updates.description = body.description ? String(body.description).trim() : null;
	}

	if (body.artist !== undefined) {
		updates.artist = body.artist ? String(body.artist).trim() : null;
	}

	if (body.slug !== undefined) {
		const slug = String(body.slug).trim().toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 100);
		if (!slug) return json({ error: 'Slug must contain at least one alphanumeric character' }, { status: 400 });

		const existing = db.select({ id: collections.id })
			.from(collections)
			.where(and(eq(collections.slug, slug), ne(collections.id, params.id)))
			.get();
		if (existing) return json({ error: 'Slug already in use' }, { status: 400 });
		updates.slug = slug;
	}

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	updates.updatedAt = new Date().toISOString();

	db.update(collections)
		.set(updates)
		.where(eq(collections.id, params.id))
		.run();

	return json({ ok: true });
};
