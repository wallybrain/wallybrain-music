<script lang="ts">
  import TrackCard from '$lib/components/TrackCard.svelte';
  import TrackCardGrid from '$lib/components/TrackCardGrid.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { base } from '$app/paths';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import type { QueueTrack } from '$lib/stores/playerState.svelte';
  import { layoutPreference } from '$lib/stores/layoutPreference.svelte';

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

<div class="max-w-3xl mx-auto px-4">

  <FilterBar
    availableTags={data.availableTags}
    activeCategory={data.activeCategory}
    activeTags={data.activeTags}
  />

  <div class="flex justify-end mb-3">
    <div class="bg-surface-overlay rounded-lg p-0.5 flex items-center gap-1">
      <button
        onclick={() => layoutPreference.setMode('list')}
        class="p-1.5 rounded-md transition-colors {layoutPreference.mode === 'list' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}"
        aria-label="List view"
        aria-pressed={layoutPreference.mode === 'list'}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="2">
          <line x1="1" y1="4" x2="15" y2="4"/>
          <line x1="1" y1="8" x2="15" y2="8"/>
          <line x1="1" y1="12" x2="15" y2="12"/>
        </svg>
      </button>
      <button
        onclick={() => layoutPreference.setMode('grid')}
        class="p-1.5 rounded-md transition-colors {layoutPreference.mode === 'grid' ? 'bg-surface-hover text-text-primary' : 'text-text-muted hover:text-text-secondary'}"
        aria-label="Grid view"
        aria-pressed={layoutPreference.mode === 'grid'}
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" stroke-width="2">
          <rect x="1" y="1" width="5.5" height="5.5" rx="1"/>
          <rect x="9.5" y="1" width="5.5" height="5.5" rx="1"/>
          <rect x="1" y="9.5" width="5.5" height="5.5" rx="1"/>
          <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1"/>
        </svg>
      </button>
    </div>
  </div>

  {#if data.tracks.length === 0}
    {#if hasActiveFilters}
      <p class="text-text-muted">No tracks match your filters. <a href="?" class="text-accent-muted hover:text-accent-muted-hover underline underline-offset-2">Clear all filters</a></p>
    {:else}
      <p class="text-text-muted">No tracks yet.</p>
    {/if}
  {:else if layoutPreference.mode === 'grid'}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {#each data.tracks as track, i (track.id)}
        <TrackCardGrid {track} allTracks={queueTracks} index={i} />
      {/each}
    </div>
  {:else}
    <div class="space-y-3">
      {#each data.tracks as track, i (track.id)}
        <div in:fly={{ y: 15, duration: 250, delay: Math.min(i * 60, 600), easing: cubicOut }}>
          <TrackCard {track} allTracks={queueTracks} index={i} />
        </div>
      {/each}
    </div>
  {/if}
</div>
