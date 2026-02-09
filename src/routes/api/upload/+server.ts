import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { validateAudioFile } from '$lib/server/validators/magicBytes';
import { enqueueProcessing } from '$lib/server/queue';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

function slugify(filename: string): string {
	const name = filename.replace(/\.[^.]+$/, '');
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 100);
	return slug || '';
}

function titleFromFilename(filename: string): string {
	return filename.replace(/\.[^.]+$/, '');
}

export const POST: RequestHandler = async ({ request }) => {
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json({ error: 'Audio file required' }, { status: 400 });
	}
	const file = formData.get('audio') as File | null;

	if (!file || !file.name || file.size === 0) {
		return json({ error: 'Audio file required' }, { status: 400 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const validation = await validateAudioFile(buffer);

	if (!validation.valid) {
		return json({ error: validation.error }, { status: 400 });
	}

	const trackId = randomUUID();
	let slug = slugify(file.name) || trackId;
	const defaultTitle = titleFromFilename(file.name);
	const ext = extname(file.name);

	const originalsDir = '/data/audio/originals';
	if (!existsSync(originalsDir)) {
		mkdirSync(originalsDir, { recursive: true });
	}

	const originalPath = `${originalsDir}/${trackId}${ext}`;
	writeFileSync(originalPath, buffer);

	// Handle slug collision with retry loop
	let finalSlug = slug;
	for (let attempt = 0; attempt < 10; attempt++) {
		try {
			db.insert(tracks).values({
				id: trackId,
				slug: finalSlug,
				title: defaultTitle,
				originalFilename: file.name,
				audioPath: originalPath,
				status: 'pending'
			}).run();
			break;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (message.includes('UNIQUE constraint') && message.includes('slug')) {
				finalSlug = `${slug}-${attempt + 2}`;
				continue;
			}
			throw err;
		}
	}

	enqueueProcessing(trackId);

	return json({ trackId, slug: finalSlug, status: 'pending' }, { status: 201 });
};
