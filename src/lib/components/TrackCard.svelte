<script lang="ts">
  import CoverArt from './CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';

  let { track }: {
    track: {
      id: string;
      slug: string;
      title: string;
      duration: number | null;
      playCount: number;
      artPath: string | null;
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
    </div>
  </div>
</a>
