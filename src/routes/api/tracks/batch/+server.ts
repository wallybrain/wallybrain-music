import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collectionTracks, collections } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { unlinkSync, existsSync, readdirSync } from 'node:fs';

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

function safeUnlink(path: string) {
	try { if (existsSync(path)) unlinkSync(path); } catch {}
}

export const POST: RequestHandler = async ({ request }) => {
	const { action, trackIds, payload } = await request.json();

	if (!Array.isArray(trackIds) || trackIds.length === 0) {
		return json({ error: 'trackIds must be a non-empty array' }, { status: 400 });
	}

	const now = new Date().toISOString();

	switch (action) {
		case 'setCategory': {
			const validCategories = ['track', 'set', 'experiment', 'export', 'album', 'playlist'];
			if (!validCategories.includes(payload)) {
				return json({ error: 'Invalid category' }, { status: 400 });
			}
			db.update(tracks)
				.set({ category: payload, updatedAt: now })
				.where(inArray(tracks.id, trackIds))
				.run();
			return json({ ok: true, affected: trackIds.length });
		}

		case 'addTags': {
			const tagNames = (payload as string)
				.split(',')
				.map((t: string) => t.trim().toLowerCase())
				.filter(Boolean);

			if (tagNames.length === 0) {
				return json({ error: 'No tags provided' }, { status: 400 });
			}

			for (const name of tagNames) {
				db.insert(tags).values({ name }).onConflictDoNothing().run();
				const tag = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
				if (tag) {
					for (const trackId of trackIds) {
						db.insert(trackTags)
							.values({ trackId, tagId: tag.id })
							.onConflictDoNothing()
							.run();
					}
				}
			}
			return json({ ok: true, affected: trackIds.length });
		}

		case 'delete': {
			// Capture parent collections before cascade
			const parentCollections = db
				.select({ collectionId: collectionTracks.collectionId })
				.from(collectionTracks)
				.where(inArray(collectionTracks.trackId, trackIds))
				.all();

			const uniqueCollectionIds = [...new Set(parentCollections.map(p => p.collectionId))];

			for (const trackId of trackIds) {
				const origDir = '/data/audio/originals';
				if (existsSync(origDir)) {
					for (const f of readdirSync(origDir).filter(f => f.startsWith(trackId + '.'))) {
						safeUnlink(`${origDir}/${f}`);
					}
				}
				safeUnlink(`/data/audio/${trackId}.mp3`);
				safeUnlink(`/data/peaks/${trackId}.json`);
				safeUnlink(`/data/art/${trackId}.jpg`);
			}

			db.delete(tracks).where(inArray(tracks.id, trackIds)).run();

			for (const cId of uniqueCollectionIds) {
				recalcCollectionAggregates(cId);
			}

			return json({ ok: true, affected: trackIds.length });
		}

		default:
			return json({ error: `Unknown action: ${action}` }, { status: 400 });
	}
};
