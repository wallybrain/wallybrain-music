<script lang="ts">
  import { enhance } from '$app/forms';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import Sortable from 'sortablejs';
  import CoverArt from '$lib/components/CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';

  let { data, form } = $props();

  let collection = $derived(data.collection);

  type TrackItem = {
    id: string;
    title: string;
    slug: string;
    duration: number | null;
    artPath: string | null;
    status: string;
    category: string;
    position: number;
  };

  let trackList: TrackItem[] = $state([]);
  let trackListEl: HTMLDivElement | undefined = $state();
  let sortableInstance: Sortable | undefined;

  let confirmingRemove = $state<string | null>(null);
  let editingTitle = $state<string | null>(null);
  let editingTitleValue = $state('');
  let savingTrack = $state<string | null>(null);
  let flashTrack = $state<string | null>(null);

  $effect(() => {
    trackList = data.tracks.map((t: TrackItem) => ({ ...t }));
  });

  const categories = ['track', 'set', 'experiment', 'export', 'album', 'playlist'] as const;

  onMount(() => {
    if (trackListEl) {
      sortableInstance = Sortable.create(trackListEl, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'opacity-30',
        onEnd: async (evt) => {
          const item = trackList.splice(evt.oldIndex!, 1)[0];
          trackList.splice(evt.newIndex!, 0, item);
          const positions = trackList.map((t, i) => ({ trackId: t.id, position: i }));
          const res = await fetch(`${base}/api/collections/${collection.id}/tracks/reorder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positions }),
          });
          if (!res.ok) location.reload();
        },
      });
    }
    return () => sortableInstance?.destroy();
  });

  async function removeTrack(trackId: string) {
    const res = await fetch(`${base}/api/collections/${collection.id}/tracks/${trackId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      trackList = trackList.filter(t => t.id !== trackId);
    }
    confirmingRemove = null;
  }

  function startEditTitle(track: TrackItem) {
    editingTitle = track.id;
    editingTitleValue = track.title;
  }

  async function saveTitle(track: TrackItem) {
    const newTitle = editingTitleValue.trim();
    if (!newTitle || newTitle === track.title) {
      editingTitle = null;
      return;
    }
    savingTrack = track.id;
    const res = await fetch(`${base}/api/tracks/${track.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    savingTrack = null;
    if (res.ok) {
      const idx = trackList.findIndex(t => t.id === track.id);
      if (idx !== -1) trackList[idx].title = newTitle;
      flashSuccess(track.id);
    }
    editingTitle = null;
  }

  async function saveCategory(track: TrackItem, newCategory: string) {
    if (newCategory === track.category) return;
    savingTrack = track.id;
    const res = await fetch(`${base}/api/tracks/${track.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCategory }),
    });
    savingTrack = null;
    if (res.ok) {
      const idx = trackList.findIndex(t => t.id === track.id);
      if (idx !== -1) trackList[idx].category = newCategory;
      flashSuccess(track.id);
    }
  }

  function flashSuccess(trackId: string) {
    flashTrack = trackId;
    setTimeout(() => { flashTrack = null; }, 600);
  }

  function handleTitleKeydown(e: KeyboardEvent, track: TrackItem) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      editingTitle = null;
    }
  }

  const inputClasses = 'w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none';

  const statusColors: Record<string, string> = {
    ready: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-amber-500/20 text-amber-400',
    pending: 'bg-surface-hover/50 text-text-tertiary',
    failed: 'bg-red-500/20 text-red-400',
  };

  const typeBadge: Record<string, string> = {
    album: 'bg-purple-500/20 text-purple-400',
    playlist: 'bg-blue-500/20 text-blue-400',
  };
</script>

<svelte:head>
  <title>Edit: {collection.title} - wallybrain admin</title>
</svelte:head>

<a href="{base}/admin/collections" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block transition-colors">
  &larr; Back to collections
</a>

<div class="flex items-center gap-3 mb-6">
  <h1 class="text-xl font-bold text-text-primary">{collection.title}</h1>
  <span class="px-2 py-0.5 rounded text-xs font-medium {typeBadge[collection.type] || 'text-text-tertiary'}">
    {collection.type}
  </span>
</div>

<form method="POST" action="?/update" use:enhance enctype="multipart/form-data">
  {#if form?.error}
    <p class="text-red-400 text-sm mb-4">{form.error}</p>
  {/if}

  <div class="space-y-5">
    <div class="space-y-1">
      <label for="title" class="text-sm text-text-tertiary">Title</label>
      <input type="text" id="title" name="title" value={collection.title} required class={inputClasses} />
    </div>

    <div class="space-y-1">
      <label for="slug" class="text-sm text-text-tertiary">Slug</label>
      <input type="text" id="slug" name="slug" value={collection.slug} required class={inputClasses} />
      <p class="text-xs text-text-muted">URL: /collection/{collection.slug}</p>
    </div>

    <div class="space-y-1">
      <label for="description" class="text-sm text-text-tertiary">Description</label>
      <textarea id="description" name="description" rows="3" class="{inputClasses} resize-y">{collection.description || ''}</textarea>
    </div>

    {#if collection.type === 'album'}
      <div class="space-y-1">
        <label for="artist" class="text-sm text-text-tertiary">Artist</label>
        <input type="text" id="artist" name="artist" value={collection.artist || ''} class={inputClasses} />
      </div>
    {/if}

    <div class="space-y-2">
      <label for="coverArt" class="text-sm text-text-tertiary">Cover Art</label>
      <CoverArt trackId={collection.id} artPath={collection.artPath} title={collection.title} size="md" entityType="collections" />
      <input
        type="file"
        id="coverArt"
        name="coverArt"
        accept="image/*"
        class="text-sm text-text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-overlay file:text-text-secondary hover:file:bg-surface-hover"
      />
    </div>

    <div class="mt-6 flex justify-end">
      <button type="submit" class="bg-accent hover:bg-accent-hover text-text-primary px-6 py-2 rounded-lg font-medium transition-colors">
        Save Changes
      </button>
    </div>
  </div>
</form>

<!-- Track list -->
{#if trackList.length > 0}
  <div class="mt-8">
    <h2 class="text-lg font-semibold text-text-secondary mb-3">Tracks ({trackList.length})</h2>
    <div class="space-y-2" bind:this={trackListEl}>
      {#each trackList as track, i (track.id)}
        <div
          data-id={track.id}
          class="flex items-center gap-3 p-3 rounded-lg bg-surface-raised transition-colors {flashTrack === track.id ? 'flash-success' : ''} {savingTrack === track.id ? 'opacity-60' : ''}"
        >
          <!-- Drag handle -->
          <span class="drag-handle cursor-grab text-text-muted hover:text-text-secondary text-lg select-none shrink-0" title="Drag to reorder">&#x2837;</span>

          <!-- Position number -->
          <span class="text-xs text-text-muted font-mono w-6 text-right shrink-0">{i + 1}</span>

          <!-- Cover art -->
          <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />

          <!-- Title + duration -->
          <div class="flex-1 min-w-0">
            {#if editingTitle === track.id}
              <input
                type="text"
                bind:value={editingTitleValue}
                onblur={() => saveTitle(track)}
                onkeydown={(e) => handleTitleKeydown(e, track)}
                class="bg-surface-overlay border border-accent rounded px-2 py-0.5 text-text-secondary font-medium text-sm w-full focus:outline-none"
                autofocus
              />
            {:else}
              <button
                type="button"
                class="text-text-secondary font-medium truncate cursor-text hover:text-accent-muted transition-colors text-left w-full bg-transparent border-none p-0 text-sm"
                onclick={() => startEditTitle(track)}
                title="Click to edit title"
              >{track.title}</button>
            {/if}
            {#if track.duration}
              <p class="text-xs text-text-muted font-mono tabular-nums">{formatTime(track.duration)}</p>
            {/if}
          </div>

          <!-- Category dropdown -->
          <select
            class="bg-surface-overlay border border-border-subtle rounded px-1.5 py-0.5 text-xs text-text-muted focus:border-accent focus:outline-none cursor-pointer shrink-0"
            value={track.category || 'track'}
            onchange={(e) => saveCategory(track, (e.target as HTMLSelectElement).value)}
          >
            {#each categories as cat}
              <option value={cat} selected={cat === (track.category || 'track')}>{cat}</option>
            {/each}
          </select>

          <!-- Status badge -->
          <span class="px-2 py-0.5 rounded text-xs font-medium shrink-0 {statusColors[track.status] || 'text-text-tertiary'}">
            {track.status}
          </span>

          <!-- Remove / confirm -->
          {#if confirmingRemove === track.id}
            <span class="flex items-center gap-1 shrink-0 text-xs">
              <span class="text-text-muted">Remove?</span>
              <button
                onclick={() => removeTrack(track.id)}
                class="text-red-400 hover:text-red-300 font-medium px-1"
              >Yes</button>
              <button
                onclick={() => confirmingRemove = null}
                class="text-text-muted hover:text-text-secondary font-medium px-1"
              >No</button>
            </span>
          {:else}
            <button
              onclick={() => confirmingRemove = track.id}
              class="text-text-muted hover:text-red-400 transition-colors shrink-0 text-sm"
              title="Remove from collection"
            >&times;</button>
          {/if}

          <!-- Edit link -->
          <a
            href="{base}/admin/tracks/{track.id}"
            class="text-text-muted hover:text-accent-muted transition-colors shrink-0 text-sm"
            title="Edit track details"
          >&#x270E;</a>
        </div>
      {/each}
    </div>
  </div>
{/if}

{#if collection.slug}
  <div class="mt-6">
    <a href="{base}/collection/{collection.slug}" class="text-accent-muted hover:text-accent-muted-hover text-sm transition-colors">
      View public page &rarr;
    </a>
  </div>
{/if}

<!-- Danger Zone -->
<div class="mt-12 border border-red-500/30 rounded-lg p-5">
  <h2 class="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>

  <div class="flex items-center justify-between gap-4">
    <div>
      <p class="text-sm text-text-secondary">Delete Collection</p>
      <p class="text-xs text-text-muted">Remove this collection. Tracks will be preserved (just unlinked).</p>
    </div>
    <form method="POST" action="?/delete" use:enhance={({ cancel }) => { if (!confirm('Delete this collection? Tracks will NOT be deleted, just unlinked.')) { cancel(); return; } }} class="shrink-0">
      <button
        type="submit"
        class="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-1.5 rounded text-sm font-medium transition-colors"
      >
        Delete Collection
      </button>
    </form>
  </div>
</div>

<style>
  .flash-success {
    animation: flash-green 0.6s ease-out;
  }
  @keyframes flash-green {
    0% { background-color: rgba(16, 185, 129, 0.25); }
    100% { background-color: transparent; }
  }
</style>
