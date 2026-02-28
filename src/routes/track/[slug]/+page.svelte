<script lang="ts">
	import WaveformPlayer from '$lib/components/WaveformPlayer.svelte';
	import TrackCard from '$lib/components/TrackCard.svelte';
	import CoverArt from '$lib/components/CoverArt.svelte';
	import { formatTime } from '$lib/utils/formatTime';
	import { rgbHexToOklch } from '$lib/utils/colorUtils';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { playerState, type QueueTrack } from '$lib/stores/playerState.svelte';

	let { data } = $props();
	let track = $derived(data.track);
	let trackTags = $derived(data.tags);
	let isAdmin = $derived(data.isAdmin);

	let startTime = $derived(Number(page.url.searchParams.get('t')) || 0);
	let waveformCurrentTime = $state(0);
	let shareToast = $state(false);

	let ambientStyle = $derived.by(() => {
		if (!track.dominantColor) return '';
		const oklch = rgbHexToOklch(track.dominantColor);
		const tintL = Math.max(0.15, oklch.l * 0.35);
		const tintC = oklch.c * 0.4;
		return `--track-tint: oklch(${tintL.toFixed(3)} ${tintC.toFixed(3)} ${oklch.h.toFixed(1)} / 0.15); --track-glow: ${track.dominantColor};`;
	});

	let isPlayingThisTrack = $derived(playerState.currentTrack?.id === track.id);

	// Build album queue from siblings + current track, preserving album order
	let albumQueue = $derived.by<QueueTrack[]>(() => {
		if (data.siblings.length === 0) return [];
		const currentQueueTrack: QueueTrack = {
			id: track.id,
			slug: track.slug,
			title: track.title,
			duration: track.duration ?? 0,
			artPath: track.hasArt ? 'yes' : null,
		};
		const siblingQueueTracks: QueueTrack[] = data.siblings.map(s => ({
			id: s.id,
			slug: s.slug,
			title: s.title,
			duration: s.duration ?? 0,
			artPath: s.artPath,
		}));
		// Insert current track at its album position
		const all = [...siblingQueueTracks];
		all.splice(data.currentTrackPosition, 0, currentQueueTrack);
		return all;
	});

	let currentAlbumIndex = $derived(data.currentTrackPosition);

	// Sibling tracks with tags (empty) for TrackCard compatibility
	let siblingTrackCards = $derived(data.siblings.map(s => ({
		...s,
		playCount: s.playCount ?? 0,
		tags: [] as string[],
	})));

	function playInPersistentPlayer() {
		const queueTrack: QueueTrack = {
			id: track.id,
			slug: track.slug,
			title: track.title,
			duration: track.duration ?? 0,
			artPath: track.hasArt ? 'yes' : null,
		};
		if (albumQueue.length > 0) {
			playerState.play(queueTrack, albumQueue, currentAlbumIndex);
		} else {
			playerState.play(queueTrack);
		}
	}

	function copyShareLink() {
		const time = Math.floor(waveformCurrentTime);
		const url = time > 0
			? `https://wallybrain.net/track/${track.slug}?t=${time}`
			: `https://wallybrain.net/track/${track.slug}`;
		navigator.clipboard.writeText(url);
		shareToast = true;
		setTimeout(() => { shareToast = false; }, 2000);
	}
</script>

<svelte:head>
	<title>{track.title} - wallybrain</title>
	<meta name="description" content={track.description || `Listen to ${track.title} by wallybrain`} />
	<link rel="canonical" href={`https://wallybrain.net/track/${track.slug}`} />

	<!-- Open Graph -->
	<meta property="og:title" content={track.title} />
	<meta property="og:description" content={track.description || `Listen to ${track.title} by wallybrain`} />
	<meta property="og:type" content="music.song" />
	<meta property="og:url" content={`https://wallybrain.net/track/${track.slug}`} />
	<meta property="og:image" content={`https://wallybrain.net/api/tracks/${track.id}/art`} />
	<meta property="og:site_name" content="wallybrain" />
	{#if track.duration}
		<meta property="music:duration" content={String(track.duration)} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={track.title} />
	<meta name="twitter:description" content={track.description || `Listen to ${track.title} by wallybrain`} />
	<meta name="twitter:image" content={`https://wallybrain.net/api/tracks/${track.id}/art`} />

	<!-- Structured Data -->
	{@html `<script type="application/ld+json">${JSON.stringify({
		"@context": "https://schema.org",
		"@type": "MusicRecording",
		"name": track.title,
		"url": `https://wallybrain.net/track/${track.slug}`,
		"byArtist": { "@type": "MusicGroup", "name": "wallybrain" },
		...(track.duration ? { "duration": `PT${Math.floor(track.duration / 60)}M${Math.floor(track.duration % 60)}S` } : {}),
		...(track.description ? { "description": track.description } : {}),
		...(data.album ? { "inAlbum": { "@type": "MusicAlbum", "name": data.album.title, "url": `https://wallybrain.net/collection/${data.album.slug}` } } : {})
	})}</script>`}
</svelte:head>

<div class="relative max-w-3xl mx-auto px-4 py-8" style={ambientStyle}>
	{#if track.dominantColor}
		<div class="absolute inset-0 -z-10 rounded-xl bg-[var(--track-tint)]"
			style="mask-image: radial-gradient(ellipse at top, black 0%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at top, black 0%, transparent 70%);">
		</div>
	{/if}
	{#if data.album}
		<a href="{base}/collection/{data.album.slug}" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block">
			&larr; Back to {data.album.title}
		</a>
	{:else}
		<a href="{base}/" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block">
			&larr; Back to tracks
		</a>
	{/if}

	<div class="flex flex-col md:flex-row gap-6 mb-8">
		<CoverArt trackId={track.id} artPath={track.hasArt ? 'yes' : null} title={track.title} size="lg" dominantColor={track.dominantColor} />
		<div class="flex-1">
			<div class="flex items-start justify-between gap-3 mb-2">
				<h1 class="text-2xl md:text-3xl font-bold text-text-primary">{track.title}</h1>
				{#if isAdmin}
					<a href="{base}/admin/tracks/{track.id}" class="shrink-0 text-xs text-text-muted hover:text-text-tertiary transition-colors">edit</a>
				{/if}
			</div>
			<span class="text-xs uppercase tracking-wider bg-surface-overlay text-text-tertiary px-2 py-0.5 rounded">
				{track.category}
			</span>
			{#if track.duration}
				<p class="text-text-tertiary text-sm mt-2 font-mono tabular-nums">{formatTime(track.duration)}</p>
			{/if}
			<p class="text-text-muted text-xs mt-1">{track.playCount} plays</p>
			{#if trackTags.length > 0}
				<div class="flex flex-wrap gap-1.5 mt-3">
					{#each trackTags as tag}
						<span class="text-xs bg-surface-overlay text-text-tertiary px-2 py-0.5 rounded">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="mb-8">
		{#if isPlayingThisTrack}
			<div class="flex items-center gap-3 py-4">
				<button onclick={() => playerState.togglePlayPause()}
					class="px-4 py-1.5 rounded bg-accent hover:bg-accent-hover text-text-primary text-sm font-medium">
					{playerState.isPlaying ? 'Pause' : 'Resume'}
				</button>
				<span class="text-sm text-accent-muted">Now playing in bottom player</span>
			</div>
		{:else}
			<WaveformPlayer trackId={track.id} duration={track.duration ?? 0} {startTime} bind:currentTime={waveformCurrentTime} />
			<div class="flex items-center gap-3 mt-2">
				<button onclick={playInPersistentPlayer}
					class="text-xs text-text-muted hover:text-text-secondary transition-colors">
					{albumQueue.length > 0 ? 'Play album in queue' : 'Play with continuous queue'}
				</button>
				<button onclick={copyShareLink}
					class="text-xs text-text-muted hover:text-text-secondary transition-colors">
					{shareToast ? 'Copied!' : 'Copy link at current time'}
				</button>
			</div>
		{/if}
	</div>

	{#if track.description}
		<div class="mt-8">
			<h2 class="text-lg font-semibold text-text-secondary mb-3">About this track</h2>
			<p class="text-text-tertiary whitespace-pre-wrap leading-relaxed">{track.description}</p>
		</div>
	{/if}

	{#if data.siblings.length > 0 && data.album}
		<div class="mt-8">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-lg font-semibold text-text-secondary">
					More from <a href="{base}/collection/{data.album.slug}" class="text-accent hover:text-accent-hover transition-colors">{data.album.title}</a>
				</h2>
			</div>
			<div class="space-y-3">
				{#each siblingTrackCards as sibling, i (sibling.id)}
					<TrackCard track={sibling} allTracks={albumQueue} index={albumQueue.findIndex(t => t.id === sibling.id)} />
				{/each}
			</div>
		</div>
	{/if}

	<div class="mt-8 pt-6 border-t border-border-subtle">
		<p class="text-xs text-text-muted">
			Added {new Date(track.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>
</div>
