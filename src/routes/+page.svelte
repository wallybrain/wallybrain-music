<script lang="ts">
  import TrackCard from '$lib/components/TrackCard.svelte';
  import CollectionCard from '$lib/components/CollectionCard.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { QueueTrack } from '$lib/stores/playerState.svelte';

  let { data } = $props();

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

<div class="max-w-3xl mx-auto px-4 pt-2">

  {#if data.collections.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
      {#each data.collections as collection (collection.id)}
        <CollectionCard {collection} mode="grid" />
      {/each}
    </div>
  {/if}

  {#if data.tracks.length > 0}
    <div class="space-y-3">
      {#each data.tracks as track, i (track.id)}
        <div in:fly={{ y: 15, duration: 250, delay: Math.min(i * 60, 600), easing: cubicOut }}>
          <TrackCard {track} allTracks={queueTracks} index={i} />
        </div>
      {/each}
    </div>
  {/if}

  <!-- Filter bar -->
  <div class="metal-panel rounded-lg px-4 py-3 mt-6">
    <FilterBar
      availableTags={data.availableTags}
      activeCategory={data.activeCategory}
      activeTags={data.activeTags}
    />
  </div>
</div>
