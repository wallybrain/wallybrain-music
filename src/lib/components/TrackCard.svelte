<script lang="ts">
  import CoverArt from './CoverArt.svelte';
  import EqIndicator from './EqIndicator.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';
  import { playerState, type QueueTrack } from '$lib/stores/playerState.svelte';

  const categoryLabels: Record<string, string> = {
    track: 'Finished',
    set: 'Set',
    experiment: 'Experiment',
    export: 'Export',
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
  class="flex items-center gap-4 p-3 rounded-lg bg-surface-raised hover:bg-surface-hover transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:shadow-accent/10 group"
>
  <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />
  <div class="flex-1 min-w-0">
    <h2 class="text-text-secondary font-medium truncate group-hover:text-text-primary transition-colors">
      {track.title}
    </h2>
    <div class="flex items-center gap-3 text-xs text-text-muted mt-1">
      {#if track.duration}
        <span class="font-mono tabular-nums">{formatTime(track.duration)}</span>
      {/if}
      <span>{track.playCount} plays</span>
      <span class="uppercase tracking-wider">{categoryLabels[track.category] ?? track.category}</span>
    </div>
    {#if track.tags.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-1.5">
        {#each track.tags as tag}
          <span class="text-xs bg-surface-overlay/50 text-text-muted px-1.5 py-0.5 rounded">{tag}</span>
        {/each}
      </div>
    {/if}
  </div>
  {#if isPlaying}
    <div class="shrink-0 flex items-center gap-2">
      <EqIndicator />
      <button
        onclick={handleToggle}
        class="w-8 h-8 rounded-full bg-accent hover:bg-accent-hover text-text-primary flex items-center justify-center text-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
        aria-label="Pause"
      >&#9646;&#9646;</button>
    </div>
  {:else if isCurrentTrack}
    <button
      onclick={handleToggle}
      class="shrink-0 w-8 h-8 rounded-full bg-surface-hover ring-2 ring-accent hover:bg-surface-hover text-text-primary flex items-center justify-center text-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
      aria-label="Resume"
    >&#9654;</button>
  {:else}
    <button
      onclick={handlePlay}
      class="shrink-0 w-8 h-8 rounded-full bg-accent hover:bg-accent-hover text-text-primary flex items-center justify-center text-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
      aria-label="Play"
    >&#9654;</button>
  {/if}
</a>
