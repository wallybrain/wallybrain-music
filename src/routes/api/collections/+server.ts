import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { collections } from '$lib/server/db/schema';
import { randomUUID } from 'node:crypto';

function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100);
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { title, description, type, artist } = body;

	if (!title || !title.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	if (type !== 'album' && type !== 'playlist' && type !== 'single') {
		return json({ error: 'Type must be album, playlist, or single' }, { status: 400 });
	}

	const collectionId = randomUUID();
	const slug = slugify(title.trim()) || collectionId;

	let finalSlug = slug;
	for (let attempt = 0; attempt < 10; attempt++) {
		try {
			db.insert(collections).values({
				id: collectionId,
				slug: finalSlug,
				title: title.trim(),
				description: description?.trim() || null,
				type,
				artist: type === 'album' ? (artist?.trim() || null) : null,
			}).run();
			break;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes('UNIQUE constraint') && message.includes('slug')) {
				finalSlug = `${slug}-${attempt + 2}`;
				continue;
			}
			throw err;
		}
	}

	return json({ collectionId, slug: finalSlug }, { status: 201 });
};
