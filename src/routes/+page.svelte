<script lang="ts">
  import TrackCard from '$lib/components/TrackCard.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { base } from '$app/paths';
  import type { QueueTrack } from '$lib/stores/playerState.svelte';

  let { data } = $props();

  let hasActiveFilters = $derived(data.activeCategory !== null || data.activeTags.length > 0);
  let queueTracks = $derived<QueueTrack[]>(data.tracks.map(t => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    duration: t.duration ?? 0,
    artPath: t.artPath,
  })));
</script>

<svelte:head>
  <title>wallybrain</title>
  <meta name="description" content="Electronic music by wallybrain" />
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-white mb-2">Tracks</h1>
  <p class="text-zinc-500 text-sm mb-6">electronic music</p>

  <FilterBar
    availableTags={data.availableTags}
    activeCategory={data.activeCategory}
    activeTags={data.activeTags}
  />

  {#if data.tracks.length === 0}
    {#if hasActiveFilters}
      <p class="text-zinc-500">No tracks match your filters. <a href="?" class="text-violet-400 hover:text-violet-300 underline underline-offset-2">Clear all filters</a></p>
    {:else}
      <p class="text-zinc-500">No tracks yet.</p>
    {/if}
  {:else}
    <div class="space-y-3">
      {#each data.tracks as track, i (track.id)}
        <TrackCard {track} allTracks={queueTracks} index={i} />
      {/each}
    </div>
  {/if}
</div>
