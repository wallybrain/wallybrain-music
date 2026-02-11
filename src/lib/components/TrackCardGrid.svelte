<script lang="ts">
  import EqIndicator from './EqIndicator.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';
  import { playerState, type QueueTrack } from '$lib/stores/playerState.svelte';

  const categoryLabels: Record<string, string> = {
    track: 'Finished',
    set: 'Set',
    experiment: 'Experiment',
    export: 'Export',
    album: 'Album',
    playlist: 'Playlist',
  };

  let { track, allTracks, index }: {
    track: {
      id: string;
      slug: string;
      title: string;
      duration: number | null;
      playCount: number;
      artPath: string | null;
      category: string;
      tags: string[];
      dominantColor?: string | null;
    };
    allTracks?: QueueTrack[];
    index?: number;
  } = $props();

  let isCurrentTrack = $derived(playerState.currentTrack?.id === track.id);
  let isPlaying = $derived(isCurrentTrack && playerState.isPlaying);

  function handlePlay(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const queueTrack: QueueTrack = {
      id: track.id,
      slug: track.slug,
      title: track.title,
      duration: track.duration ?? 0,
      artPath: track.artPath,
    };
    playerState.play(queueTrack, allTracks ?? [queueTrack], index ?? 0);
  }

  function handleToggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    playerState.togglePlayPause();
  }
</script>

<a
  href="{base}/track/{track.slug}"
  class="flex flex-col rounded-lg metal-panel transition-all overflow-hidden group {isCurrentTrack ? 'ring-1 ring-accent/30' : ''}"
>
  <div class="relative aspect-square overflow-hidden bevel-image rounded-t-lg">
    {#if track.artPath}
      <img
        src="{base}/api/tracks/{track.id}/art"
        alt={track.title}
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        loading="lazy"
      />
    {:else}
      <div class="w-full h-full bg-gradient-to-br from-surface-overlay to-surface-hover flex items-center justify-center">
        <svg class="w-12 h-12 text-text-muted/30" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
    {/if}

    <!-- Play/Pause overlay -->
    <button
      onclick={isCurrentTrack ? handleToggle : handlePlay}
      class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      aria-label={isPlaying ? 'Pause' : 'Play'}
    >
      <span class="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-text-primary">
        {#if isPlaying}
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        {:else}
          <svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        {/if}
      </span>
    </button>

    <!-- EqIndicator for playing state -->
    {#if isPlaying}
      <div class="absolute top-2 right-2 bg-accent/80 rounded-full px-1.5 py-1">
        <EqIndicator />
      </div>
    {/if}
  </div>

  <div class="p-3">
    <h2 class="text-sm font-medium text-text-secondary truncate group-hover:text-text-primary transition-colors">
      {track.title}
    </h2>
    <div class="flex items-center gap-2 text-xs text-text-muted mt-1">
      {#if track.duration}
        <span class="font-mono tabular-nums">{formatTime(track.duration)}</span>
      {/if}
      <span class="uppercase tracking-wider">{categoryLabels[track.category] ?? track.category}</span>
    </div>
  </div>
</a>
