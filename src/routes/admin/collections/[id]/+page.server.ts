import { db } from '$lib/server/db/client';
import { collections, collectionTracks, tracks } from '$lib/server/db/schema';
import { eq, and, ne, asc } from 'drizzle-orm';
import { fail, error, redirect } from '@sveltejs/kit';
import { extractAndResizeArt, extractDominantColor } from '$lib/server/processors/artwork';
import { mkdirSync } from 'node:fs';
import type { Actions, PageServerLoad } from './$types';
import { validateImageBuffer, MAX_IMAGE_SIZE } from '$lib/server/security';

export const load: PageServerLoad = async ({ params }) => {
	const collection = db
		.select()
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) {
		throw error(404, 'Collection not found');
	}

	const orderedTracks = db
		.select({
			id: tracks.id,
			title: tracks.title,
			slug: tracks.slug,
			duration: tracks.duration,
			artPath: tracks.artPath,
			status: tracks.status,
			position: collectionTracks.position,
		})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(eq(collectionTracks.collectionId, params.id))
		.orderBy(asc(collectionTracks.position))
		.all();

	return { collection, tracks: orderedTracks };
};

export const actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const artist = formData.get('artist') as string;
		const slug = formData.get('slug') as string;
		const coverArt = formData.get('coverArt') as File;

		if (!title || !title.trim()) {
			return fail(400, { error: 'Title is required' });
		}

		if (!slug || !slug.trim()) {
			return fail(400, { error: 'Slug is required' });
		}

		const validatedSlug = slug
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 100);

		if (!validatedSlug) {
			return fail(400, { error: 'Slug must contain at least one alphanumeric character' });
		}

		const existing = db
			.select({ id: collections.id })
			.from(collections)
			.where(and(eq(collections.slug, validatedSlug), ne(collections.id, params.id)))
			.get();

		if (existing) {
			return fail(400, { error: 'Slug already in use by another collection' });
		}

		db.update(collections)
			.set({
				title: title.trim(),
				description: description?.trim() || null,
				artist: artist?.trim() || null,
				slug: validatedSlug,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(collections.id, params.id))
			.run();

		if (coverArt && coverArt.size > 0) {
			if (coverArt.size > MAX_IMAGE_SIZE) {
				return fail(413, { error: 'Image too large (10MB max)' });
			}

			const artBuffer = Buffer.from(await coverArt.arrayBuffer());

			const imageCheck = await validateImageBuffer(artBuffer);
			if (!imageCheck.valid) {
				return fail(400, { error: imageCheck.error });
			}
			const artDir = '/data/art/collections';
			mkdirSync(artDir, { recursive: true });
			const artPath = `${artDir}/${params.id}.jpg`;

			await extractAndResizeArt(artBuffer, artPath);
			const dominantColor = await extractDominantColor(artPath);

			db.update(collections)
				.set({ artPath, dominantColor, updatedAt: new Date().toISOString() })
				.where(eq(collections.id, params.id))
				.run();
		}

		redirect(303, '/admin/collections');
	},
} satisfies Actions;
