import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createReadStream, statSync, mkdirSync } from 'node:fs';
import { Readable } from 'node:stream';
import { db } from '$lib/server/db/client';
import { collections } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { extractAndResizeArt, extractDominantColor } from '$lib/server/processors/artwork';
import { validateDataPath, validateImageBuffer, MAX_IMAGE_SIZE } from '$lib/server/security';

export const GET: RequestHandler = async ({ params }) => {
	const collection = db.select({ artPath: collections.artPath })
		.from(collections)
		.where(eq(collections.id, params.id))
		.get();

	if (!collection || !collection.artPath) {
		throw error(404, 'Cover art not found');
	}

	let safePath: string;
	try {
		safePath = validateDataPath(collection.artPath);
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

	if (file.size > MAX_IMAGE_SIZE) {
		return json({ error: 'Image too large (10MB max)' }, { status: 413 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());

	const imageCheck = await validateImageBuffer(buffer);
	if (!imageCheck.valid) {
		return json({ error: imageCheck.error }, { status: 400 });
	}

	const artDir = '/data/art/collections';
	mkdirSync(artDir, { recursive: true });
	const artPath = `${artDir}/${params.id}.jpg`;

	await extractAndResizeArt(buffer, artPath);
	const dominantColor = await extractDominantColor(artPath);

	db.update(collections)
		.set({ artPath, dominantColor, updatedAt: new Date().toISOString() })
		.where(eq(collections.id, params.id))
		.run();

	return json({ artPath, dominantColor }, { status: 200 });
};
