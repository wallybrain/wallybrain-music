<script lang="ts">
	import WaveformPlayer from '$lib/components/WaveformPlayer.svelte';
	import CoverArt from '$lib/components/CoverArt.svelte';
	import { formatTime } from '$lib/utils/formatTime';
	import { rgbHexToOklch } from '$lib/utils/colorUtils';
	import { base } from '$app/paths';
	import { playerState, type QueueTrack } from '$lib/stores/playerState.svelte';

	let { data } = $props();
	let track = $derived(data.track);
	let trackTags = $derived(data.tags);
	let isAdmin = $derived(data.isAdmin);

	let ambientStyle = $derived.by(() => {
		if (!track.dominantColor) return '';
		const oklch = rgbHexToOklch(track.dominantColor);
		const tintL = Math.max(0.15, oklch.l * 0.35);
		const tintC = oklch.c * 0.4;
		return `--track-tint: oklch(${tintL.toFixed(3)} ${tintC.toFixed(3)} ${oklch.h.toFixed(1)} / 0.15); --track-glow: ${track.dominantColor};`;
	});

	let isPlayingThisTrack = $derived(playerState.currentTrack?.id === track.id);

	function playInPersistentPlayer() {
		const queueTrack: QueueTrack = {
			id: track.id,
			slug: track.slug,
			title: track.title,
			duration: track.duration ?? 0,
			artPath: track.artPath,
		};
		playerState.play(queueTrack);
	}
</script>

<svelte:head>
	<title>{track.title} - wallybrain</title>
	<meta name="description" content={track.description || `Listen to ${track.title} by wallybrain`} />
	<link rel="canonical" href={`https://wallyblanchard.com/music/track/${track.slug}`} />

	<!-- Open Graph -->
	<meta property="og:title" content={track.title} />
	<meta property="og:description" content={track.description || `Listen to ${track.title} by wallybrain`} />
	<meta property="og:type" content="music.song" />
	<meta property="og:url" content={`https://wallyblanchard.com/music/track/${track.slug}`} />
	<meta property="og:image" content={`https://wallyblanchard.com/music/api/tracks/${track.id}/art`} />
	<meta property="og:site_name" content="wallybrain" />
	{#if track.duration}
		<meta property="music:duration" content={String(track.duration)} />
	{/if}

	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={track.title} />
	<meta name="twitter:description" content={track.description || `Listen to ${track.title} by wallybrain`} />
	<meta name="twitter:image" content={`https://wallyblanchard.com/music/api/tracks/${track.id}/art`} />
</svelte:head>

<div class="relative max-w-3xl mx-auto px-4 py-8" style={ambientStyle}>
	{#if track.dominantColor}
		<div class="absolute inset-0 -z-10 rounded-xl bg-[var(--track-tint)]"
			style="mask-image: radial-gradient(ellipse at top, black 0%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at top, black 0%, transparent 70%);">
		</div>
	{/if}
	<a href="{base}/" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block">
		&larr; Back to tracks
	</a>

	<div class="flex flex-col md:flex-row gap-6 mb-8">
		<CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="lg" dominantColor={track.dominantColor} />
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
			<WaveformPlayer trackId={track.id} duration={track.duration ?? 0} />
			<button onclick={playInPersistentPlayer}
				class="mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors">
				Play with continuous queue
			</button>
		{/if}
	</div>

	{#if track.description}
		<div class="mt-8">
			<h2 class="text-lg font-semibold text-text-secondary mb-3">About this track</h2>
			<p class="text-text-tertiary whitespace-pre-wrap leading-relaxed">{track.description}</p>
		</div>
	{/if}

	<div class="mt-8 pt-6 border-t border-border-subtle">
		<p class="text-xs text-text-muted">
			Added {new Date(track.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>
</div>
