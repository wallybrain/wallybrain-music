<script lang="ts">
  import CoverArt from './CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';

  const categoryLabels: Record<string, string> = {
    track: 'Finished',
    set: 'Set',
    experiment: 'Experiment',
    export: 'Export',
  };

  let { track }: {
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
  } = $props();
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
</a>
