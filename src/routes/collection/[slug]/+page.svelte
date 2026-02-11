<script lang="ts">
  import TrackCard from '$lib/components/TrackCard.svelte';
  import CoverArt from '$lib/components/CoverArt.svelte';
  import { base } from '$app/paths';
  import { formatTime } from '$lib/utils/formatTime';
  import { playerState, type QueueTrack } from '$lib/stores/playerState.svelte';

  let { data } = $props();

  let queueTracks = $derived<QueueTrack[]>(data.tracks.map(t => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    duration: t.duration ?? 0,
    artPath: t.artPath,
  })));

  function playAll() {
    if (queueTracks.length > 0) {
      playerState.play(queueTracks[0], queueTracks, 0);
    }
  }
</script>

<svelte:head>
  <title>{data.collection.title} - wallybrain</title>
  <meta name="description" content={data.collection.description || `${data.collection.type === 'album' ? 'Album' : 'Playlist'}: ${data.collection.title}`} />
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
  <!-- Collection header -->
  <div class="flex flex-col sm:flex-row gap-6 mb-8">
    <div class="shrink-0">
      <CoverArt
        trackId={data.collection.id}
        artPath={data.collection.artPath}
        title={data.collection.title}
        size="lg"
        dominantColor={data.collection.dominantColor}
        entityType="collections"
      />
    </div>
    <div class="flex flex-col justify-end gap-2">
      <span class="text-xs uppercase tracking-wider text-text-muted">
        {data.collection.type}
      </span>
      <h1 class="text-3xl font-bold text-text-primary">{data.collection.title}</h1>
      {#if data.collection.artist}
        <p class="text-text-secondary">{data.collection.artist}</p>
      {/if}
      {#if data.collection.description}
        <p class="text-text-muted text-sm mt-1">{data.collection.description}</p>
      {/if}
      <div class="flex items-center gap-4 text-sm text-text-muted mt-2">
        <span>{data.tracks.length} tracks</span>
        {#if data.collection.totalDuration}
          <span class="font-mono tabular-nums">{formatTime(data.collection.totalDuration)}</span>
        {/if}
      </div>
      {#if queueTracks.length > 0}
        <button
          onclick={playAll}
          class="mt-3 bg-accent hover:bg-accent-hover text-text-primary px-6 py-2.5 rounded-lg font-medium transition-colors w-fit flex items-center gap-2"
        >
          <span>&#9654;</span> Play All
        </button>
      {/if}
    </div>
  </div>

  <!-- Track list -->
  {#if data.tracks.length === 0}
    <p class="text-text-muted">No tracks available yet.</p>
  {:else}
    <div class="space-y-3">
      {#each data.tracks as track, i (track.id)}
        <TrackCard {track} allTracks={queueTracks} index={i} />
      {/each}
    </div>
  {/if}

  <div class="mt-8">
    <a href="{base}/" class="text-text-muted hover:text-text-secondary text-sm transition-colors">
      &larr; Back to all tracks
    </a>
  </div>
</div>
