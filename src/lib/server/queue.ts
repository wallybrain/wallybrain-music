import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { tracks } from '$lib/server/db/schema';
import { processTrack } from '$lib/server/processors/processTrack';

let isProcessing = false;

async function processNext(): Promise<void> {
	if (isProcessing) return;

	const pending = db.select()
		.from(tracks)
		.where(eq(tracks.status, 'pending'))
		.orderBy(asc(tracks.createdAt))
		.limit(1)
		.get();

	if (!pending) return;

	isProcessing = true;
	try {
		await processTrack(pending.id);
	} finally {
		isProcessing = false;
		setTimeout(processNext, 100);
	}
}

export function enqueueProcessing(_trackId: string): void {
	processNext();
}

export function startQueueProcessor(): void {
	console.log('Queue processor started');

	const stuck = db.select()
		.from(tracks)
		.where(eq(tracks.status, 'processing'))
		.all();

	for (const track of stuck) {
		console.log(`Resetting stuck track ${track.id} from processing to pending`);
		db.update(tracks)
			.set({ status: 'pending', updatedAt: new Date().toISOString() })
			.where(eq(tracks.id, track.id))
			.run();
	}

	processNext();

	setInterval(processNext, 5000);
}
