import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createReadStream, statSync, mkdirSync } from 'node:fs';
import { Readable } from 'node:stream';
import { db } from '$lib/server/db/client';
import { collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { extractAndResizeArt, extractDominantColor } from '$lib/server/processors/artwork';

export const GET: RequestHandler = async ({ params }) => {
	const collection = db.select({ artPath: collections.artPath })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection || !collection.artPath) {
		throw error(404, 'Cover art not found');
	}

	let fileSize: number;
	try {
		fileSize = statSync(collection.artPath).size;
	} catch {
		throw error(404, 'Cover art not found');
	}

	const stream = createReadStream(collection.artPath);
	return new Response(Readable.toWeb(stream) as ReadableStream, {
		headers: {
			'Content-Type': 'image/jpeg',
			'Content-Length': String(fileSize),
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	});
};

export const POST: RequestHandler = async ({ request, params }) => {
	const collection = db.select({ id: collections.id })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection) {
		return json({ error: 'Collection not found' }, { status: 404 });
	}

	const formData = await request.formData();
	const file = formData.get('coverArt') as File | null;

	if (!file || file.size === 0) {
		return json({ error: 'Cover art file required' }, { status: 400 });
	}

	const artDir = '/data/art/collections';
	mkdirSync(artDir, { recursive: true });
	const artPath = `${artDir}/${params.id}.jpg`;

	const buffer = Buffer.from(await file.arrayBuffer());
	await extractAndResizeArt(buffer, artPath);
	const dominantColor = await extractDominantColor(artPath);

	db.update(collections)
		.set({ artPath, dominantColor, updatedAt: new Date().toISOString() })
		.where(eq(collections.id, params.id))
		.run();

	return json({ artPath, dominantColor }, { status: 200 });
};
