<script lang="ts">
	import WaveformPlayer from '$lib/components/WaveformPlayer.svelte';
	import CoverArt from '$lib/components/CoverArt.svelte';
	import { formatTime } from '$lib/utils/formatTime';
	import { base } from '$app/paths';

	let { data } = $props();
	let track = $derived(data.track);
	let trackTags = $derived(data.tags);
	let isAdmin = $derived(data.isAdmin);
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

<div class="max-w-3xl mx-auto px-4 py-8">
	<a href="{base}/" class="text-zinc-500 hover:text-zinc-300 text-sm mb-6 inline-block">
		&larr; Back to tracks
	</a>

	<div class="flex flex-col md:flex-row gap-6 mb-8">
		<CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="lg" />
		<div class="flex-1">
			<div class="flex items-start justify-between gap-3 mb-2">
				<h1 class="text-2xl md:text-3xl font-bold text-white">{track.title}</h1>
				{#if isAdmin}
					<a href="{base}/admin/tracks/{track.id}" class="shrink-0 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">edit</a>
				{/if}
			</div>
			<span class="text-xs uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
				{track.category}
			</span>
			{#if track.duration}
				<p class="text-zinc-400 text-sm mt-2">{formatTime(track.duration)}</p>
			{/if}
			<p class="text-zinc-500 text-xs mt-1">{track.playCount} plays</p>
			{#if trackTags.length > 0}
				<div class="flex flex-wrap gap-1.5 mt-3">
					{#each trackTags as tag}
						<span class="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<div class="mb-8">
		<WaveformPlayer trackId={track.id} duration={track.duration ?? 0} />
	</div>

	{#if track.description}
		<div class="mt-8">
			<h2 class="text-lg font-semibold text-zinc-300 mb-3">About this track</h2>
			<p class="text-zinc-400 whitespace-pre-wrap leading-relaxed">{track.description}</p>
		</div>
	{/if}

	<div class="mt-8 pt-6 border-t border-zinc-800/50">
		<p class="text-xs text-zinc-600">
			Added {new Date(track.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
		</p>
	</div>
</div>
