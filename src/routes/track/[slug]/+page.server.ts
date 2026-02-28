import { db } from '$lib/server/db/client';
import { tracks, tags, trackTags, collectionTracks, collections } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const track = db
		.select({
			id: tracks.id,
			slug: tracks.slug,
			title: tracks.title,
			description: tracks.description,
			duration: tracks.duration,
			category: tracks.category,
			status: tracks.status,
			playCount: tracks.playCount,
			artPath: tracks.artPath,
			dominantColor: tracks.dominantColor,
			createdAt: tracks.createdAt,
		})
		.from(tracks)
		.where(eq(tracks.slug, params.slug))
		.get();

	if (!track || track.status !== 'ready') {
		throw error(404, 'Track not found');
	}

	// Fall back to collection art if track has none
	let hasArt = !!track.artPath;
	if (!hasArt) {
		const collectionArt = db.select({
				artPath: collections.artPath,
				dominantColor: collections.dominantColor,
			})
			.from(collectionTracks)
			.innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
			.where(eq(collectionTracks.trackId, track.id))
			.get();
		if (collectionArt?.artPath) {
			hasArt = true;
			track.dominantColor = track.dominantColor ?? collectionArt.dominantColor;
		}
	}

	const trackTagRows = db
		.select({ name: tags.name })
		.from(trackTags)
		.innerJoin(tags, eq(trackTags.tagId, tags.id))
		.where(eq(trackTags.trackId, track.id))
		.all();

	// Fetch album info for structured data
	const album = db.select({
			id: collections.id,
			title: collections.title,
			slug: collections.slug,
			artPath: collections.artPath,
			dominantColor: collections.dominantColor,
		})
		.from(collectionTracks)
		.innerJoin(collections, eq(collectionTracks.collectionId, collections.id))
		.where(eq(collectionTracks.trackId, track.id))
		.get();

	// Fetch sibling tracks from the same album
	let siblings: Array<{
		id: string;
		slug: string;
		title: string;
		duration: number | null;
		artPath: string | null;
		dominantColor: string | null;
		playCount: number;
		category: string;
		position: number;
	}> = [];
	let currentTrackPosition = 0;

	if (album) {
		// Get ALL tracks in album order (including current) so we can derive position
		const allAlbumTracks = db.select({
				id: tracks.id,
				slug: tracks.slug,
				title: tracks.title,
				duration: tracks.duration,
				artPath: tracks.artPath,
				dominantColor: tracks.dominantColor,
				playCount: tracks.playCount,
				category: tracks.category,
				position: collectionTracks.position,
			})
			.from(collectionTracks)
			.innerJoin(tracks, eq(collectionTracks.trackId, tracks.id))
			.where(and(
				eq(collectionTracks.collectionId, album.id),
				eq(tracks.status, 'ready'),
			))
			.orderBy(asc(collectionTracks.position))
			.all();

		const currentIdx = allAlbumTracks.findIndex(t => t.id === track.id);
		currentTrackPosition = currentIdx >= 0 ? currentIdx : 0;

		siblings = allAlbumTracks
			.filter(t => t.id !== track.id)
			.map(t => ({
				...t,
				artPath: t.artPath ?? album.artPath,
				dominantColor: t.dominantColor ?? album.dominantColor,
			}));
	}

	const isAdmin = !!cookies.get('authelia_session');

	const { artPath: _artPath, status: _status, ...publicTrack } = track;
	return {
		track: { ...publicTrack, hasArt },
		tags: trackTagRows.map((t) => t.name),
		isAdmin,
		album: album ? { title: album.title, slug: album.slug } : null,
		siblings,
		currentTrackPosition,
	};
};
