<script>
  import TrackCard from '$lib/components/TrackCard.svelte';
  import { base } from '$app/paths';

  let { data } = $props();
</script>

<svelte:head>
  <title>wallybrain</title>
  <meta name="description" content="Electronic music by wallybrain" />
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-white mb-2">Tracks</h1>
  <p class="text-zinc-500 text-sm mb-8">electronic music</p>

  {#if data.tracks.length === 0}
    <p class="text-zinc-500">No tracks yet.</p>
  {:else}
    <div class="space-y-3">
      {#each data.tracks as track (track.id)}
        <TrackCard {track} />
      {/each}
    </div>
  {/if}
</div>
