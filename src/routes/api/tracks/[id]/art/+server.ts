import type { RequestHandler } from './$types';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { validateDataPath } from '$lib/server/security';

export const GET: RequestHandler = async ({ params }) => {
	const track = db.select({ artPath: tracks.artPath })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track || !track.artPath) {
		throw error(404, 'Cover art not found');
	}

	let safePath: string;
	try {
		safePath = validateDataPath(track.artPath);
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
