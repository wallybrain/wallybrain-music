<script lang="ts">
  import CoverArt from './CoverArt.svelte';
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
  class="flex items-center gap-4 p-3 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/70 transition-colors group"
>
  <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />
  <div class="flex-1 min-w-0">
    <h2 class="text-zinc-200 font-medium truncate group-hover:text-white transition-colors">
      {track.title}
    </h2>
    <div class="flex items-center gap-3 text-xs text-zinc-500 mt-1">
      {#if track.duration}
        <span>{formatTime(track.duration)}</span>
      {/if}
      <span>{track.playCount} plays</span>
      <span class="uppercase tracking-wider">{categoryLabels[track.category] ?? track.category}</span>
    </div>
    {#if track.tags.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-1.5">
        {#each track.tags as tag}
          <span class="text-xs bg-zinc-800/50 text-zinc-500 px-1.5 py-0.5 rounded">{tag}</span>
        {/each}
      </div>
    {/if}
  </div>
  {#if isPlaying}
    <button
      onclick={handleToggle}
      class="shrink-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center text-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
      aria-label="Pause"
    >&#9646;&#9646;</button>
  {:else if isCurrentTrack}
    <button
      onclick={handleToggle}
      class="shrink-0 w-8 h-8 rounded-full bg-zinc-700 ring-2 ring-violet-500 hover:bg-zinc-600 text-white flex items-center justify-center text-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
      aria-label="Resume"
    >&#9654;</button>
  {:else}
    <button
      onclick={handlePlay}
      class="shrink-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center text-xs transition-opacity md:opacity-0 md:group-hover:opacity-100"
      aria-label="Play"
    >&#9654;</button>
  {/if}
</a>
