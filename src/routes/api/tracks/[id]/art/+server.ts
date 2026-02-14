import type { RequestHandler } from './$types';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { tracks, collectionTracks, collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateDataPath } from '$lib/server/security';

export const GET: RequestHandler = async ({ params }) => {
	const track = db.select({ artPath: tracks.artPath })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track) {
		throw error(404, 'Track not found');
	}

	let artPath = track.artPath;

	// Fall back to collection art if track has none
	if (!artPath) {
		const collectionArt = db.select({ artPath: collections.artPath })
			.from(collectionTracks)
			.innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
			.where(eq(collectionTracks.trackId, params.id))
			.get();
		artPath = collectionArt?.artPath ?? null;
	}

	if (!artPath) {
		throw error(404, 'Cover art not found');
	}

	let safePath: string;
	try {
		safePath = validateDataPath(artPath);
	} catch {
		throw error(403, 'Access denied');
	}

	let fileSize: number;
	try {
		fileSize = statSync(safePath).size;
	} catch {
		throw error(404, 'Cover art not found');
	}

	const stream = createReadStream(safePath);
	return new Response(Readable.toWeb(stream) as ReadableStream, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Length': String(fileSize),
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};
