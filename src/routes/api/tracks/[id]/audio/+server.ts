import type { RequestHandler } from './$types';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, request }) => {
	const track = db.select({ audioPath: tracks.audioPath, status: tracks.status })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track || track.status !== 'ready') {
		throw error(404, 'Track not found');
	}

	const filePath = track.audioPath;
	let fileSize: number;
	try {
		fileSize = statSync(filePath).size;
	} catch {
		throw error(404, 'Track not found');
	}

	const range = request.headers.get('range');

	const baseHeaders: Record<string, string> = {
		'Accept-Ranges': 'bytes',
		'Content-Type': 'audio/mpeg',
		'Cache-Control': 'public, max-age=31536000, immutable',
	};

	if (!range) {
		const stream = createReadStream(filePath);
		return new Response(Readable.toWeb(stream) as ReadableStream, {
			status: 200,
			headers: {
				...baseHeaders,
				'Content-Length': String(fileSize),
			},
		});
	}

	const parts = range.replace(/bytes=/, '').split('-');
	const start = parseInt(parts[0], 10);
	let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

	if (end >= fileSize) {
		end = fileSize - 1;
	}

	const chunkSize = end - start + 1;
	const stream = createReadStream(filePath, { start, end });

	return new Response(Readable.toWeb(stream) as ReadableStream, {
		status: 206,
		headers: {
			...baseHeaders,
			'Content-Range': `bytes ${start}-${end}/${fileSize}`,
			'Content-Length': String(chunkSize),
		},
	});
};
