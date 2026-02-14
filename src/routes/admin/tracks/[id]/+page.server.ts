import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collectionTracks, collections } from '$lib/server/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { fail, error, redirect } from '@sveltejs/kit';
import { extractAndResizeArt } from '$lib/server/processors/artwork';
import { unlinkSync, existsSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import type { Actions, PageServerLoad } from './$types';
import { validateImageBuffer, MAX_IMAGE_SIZE, MAX_AUDIO_SIZE } from '$lib/server/security';
import { validateAudioFile } from '$lib/server/validators/magicBytes';
import { enqueueProcessing } from '$lib/server/queue';

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

function safeUnlink(path: string) {
	try {
		if (existsSync(path)) unlinkSync(path);
	} catch { /* file already gone */ }
}

function findOriginals(trackId: string): string[] {
	const dir = '/data/audio/originals';
	if (!existsSync(dir)) return [];
	return readdirSync(dir)
		.filter((f) => f.startsWith(trackId + '.'))
		.map((f) => `${dir}/${f}`);
}

function recalcCollectionAggregates(collectionId: string) {
	const agg = db.select({
		count: sql<number>`count(*)`,
		totalDur: sql<number>`coalesce(sum(${tracks.duration}), 0)`,
	})
		.from(collectionTracks)
		.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
		.where(eq(collectionTracks.collectionId, collectionId))
		.get();

	db.update(collections)
		.set({
			trackCount: agg?.count ?? 0,
			totalDuration: agg?.totalDur ?? 0,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(collections.id, collectionId))
		.run();
}

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
			if (coverArt.size > MAX_IMAGE_SIZE) {
				return fail(413, { error: 'Image too large (10MB max)' });
			}

			const artBuffer = Buffer.from(await coverArt.arrayBuffer());

			const imageCheck = await validateImageBuffer(artBuffer);
			if (!imageCheck.valid) {
				return fail(400, { error: imageCheck.error });
			}
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

	delete: async ({ params }) => {
		const track = db.select().from(tracks).where(eq(tracks.id, params.id)).get();
		if (!track) throw error(404, 'Track not found');

		// Capture parent collections before cascade deletes junction rows
		const parentCollections = db
			.select({ collectionId: collectionTracks.collectionId })
			.from(collectionTracks)
			.where(eq(collectionTracks.trackId, params.id))
			.all();

		// Delete the track (cascades track_tags + collection_tracks)
		db.delete(tracks).where(eq(tracks.id, params.id)).run();

		// Clean up files
		for (const orig of findOriginals(params.id)) safeUnlink(orig);
		safeUnlink(`/data/audio/${params.id}.mp3`);
		safeUnlink(`/data/peaks/${params.id}.json`);
		safeUnlink(`/data/art/${params.id}.jpg`);

		// Recalculate aggregates on affected collections
		for (const { collectionId } of parentCollections) {
			recalcCollectionAggregates(collectionId);
		}

		redirect(303, '/admin');
	},

	deleteArt: async ({ params }) => {
		const track = db.select().from(tracks).where(eq(tracks.id, params.id)).get();
		if (!track) throw error(404, 'Track not found');

		safeUnlink(`/data/art/${params.id}.jpg`);

		db.update(tracks)
			.set({ artPath: null, dominantColor: null, updatedAt: new Date().toISOString() })
			.where(eq(tracks.id, params.id))
			.run();

		return { success: true };
	},

	reupload: async ({ request, params }) => {
		const track = db.select().from(tracks).where(eq(tracks.id, params.id)).get();
		if (!track) throw error(404, 'Track not found');

		const formData = await request.formData();
		const audioFile = formData.get('audioFile') as File;

		if (!audioFile || audioFile.size === 0) {
			return fail(400, { error: 'No audio file provided' });
		}

		if (audioFile.size > MAX_AUDIO_SIZE) {
			return fail(413, { error: 'Audio file too large (200MB max)' });
		}

		const buffer = Buffer.from(await audioFile.arrayBuffer());
		const validation = await validateAudioFile(buffer);
		if (!validation.valid) {
			return fail(400, { error: validation.error });
		}

		// Delete old audio files (keep art)
		for (const orig of findOriginals(params.id)) safeUnlink(orig);
		safeUnlink(`/data/audio/${params.id}.mp3`);
		safeUnlink(`/data/peaks/${params.id}.json`);

		// Write new original
		const ext = extname(audioFile.name).toLowerCase() || '.mp3';
		const originalPath = `/data/audio/originals/${params.id}${ext}`;
		mkdirSync('/data/audio/originals', { recursive: true });
		writeFileSync(originalPath, buffer);

		// Reset processing state
		db.update(tracks)
			.set({
				status: 'pending',
				audioPath: originalPath,
				peaksPath: null,
				duration: null,
				bitrate: null,
				errorMessage: null,
				originalFilename: audioFile.name,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(tracks.id, params.id))
			.run();

		enqueueProcessing(params.id);

		return { success: true };
	},
} satisfies Actions;
