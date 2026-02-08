import type { RequestHandler } from './$types';
import { readFileSync } from 'node:fs';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const track = db.select({ peaksPath: tracks.peaksPath })
		.from(tracks)
		.where(eq(tracks.id, params.id))
		.get();

	if (!track || !track.peaksPath) {
		throw error(404, 'Peaks not found');
	}

	let raw: { data: number[] };
	try {
		raw = JSON.parse(readFileSync(track.peaksPath, 'utf-8'));
	} catch {
		throw error(404, 'Peaks not found');
	}

	const normalized = raw.data.map((v: number) => v / 127);

	return json(normalized, {
		headers: {
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};
