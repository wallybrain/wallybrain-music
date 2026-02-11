import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { fail, error, redirect } from '@sveltejs/kit';
import { extractAndResizeArt } from '$lib/server/processors/artwork';
import { mkdirSync } from 'node:fs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const track = db
		.select()
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track) {
		throw error(404, 'Track not found');
	}

	const trackTagRows = db
		.select({ name: tags.name })
		.from(trackTags)
		.innerJoin(tags, eq(trackTags.tagId, tags.id))
		.where(eq(trackTags.trackId, params.id))
		.all();

	return {
		track,
		tags: trackTagRows.map((t) => t.name),
	};
};

export const actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const category = formData.get('category') as string;
		const slug = formData.get('slug') as string;
		const tagInput = formData.get('tags') as string;
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
			.select({ id: tracks.id })
			.from(tracks)
			.where(and(eq(tracks.slug, validatedSlug), ne(tracks.id, params.id)))
			.get();

		if (existing) {
			return fail(400, { error: 'Slug already in use by another track' });
		}

		db.update(tracks)
			.set({
				title: title.trim(),
				description: description?.trim() || null,
				category: (category as 'track' | 'set' | 'experiment' | 'export' | 'album' | 'playlist') || 'track',
				slug: validatedSlug,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(tracks.id, params.id))
			.run();

		// Handle tags
		db.delete(trackTags).where(eq(trackTags.trackId, params.id)).run();

		if (tagInput && tagInput.trim()) {
			const tagNames = [
				...new Set(
					tagInput
						.split(',')
						.map((t) => t.trim().toLowerCase())
						.filter(Boolean)
				),
			];

			for (const name of tagNames) {
				db.insert(tags).values({ name }).onConflictDoNothing().run();

				const tag = db
					.select({ id: tags.id })
					.from(tags)
					.where(eq(tags.name, name))
					.get();

				if (tag) {
					db.insert(trackTags)
						.values({ trackId: params.id, tagId: tag.id })
						.onConflictDoNothing()
						.run();
				}
			}
		}

		// Handle cover art upload
		if (coverArt && coverArt.size > 0) {
			const artBuffer = Buffer.from(await coverArt.arrayBuffer());
			const artDir = '/data/art';
			mkdirSync(artDir, { recursive: true });
			const artPath = `/data/art/${params.id}.jpg`;

			await extractAndResizeArt(artBuffer, artPath);

			db.update(tracks)
				.set({ artPath, updatedAt: new Date().toISOString() })
				.where(eq(tracks.id, params.id))
				.run();
		}

		redirect(303, '/admin');
	},
} satisfies Actions;
