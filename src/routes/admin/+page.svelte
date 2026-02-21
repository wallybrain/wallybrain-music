<script lang="ts">
  import { base } from '$app/paths';
  import CoverArt from '$lib/components/CoverArt.svelte';

  let { data } = $props();

  const statusColors: Record<string, string> = {
    ready: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-amber-500/20 text-amber-400',
    pending: 'bg-surface-hover/50 text-text-tertiary',
    failed: 'bg-red-500/20 text-red-400',
  };

  type TrackRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    duration: number | null;
    artPath: string | null;
    dominantColor: string | null;
    errorMessage: string | null;
  };

  let trackRows: TrackRow[] = $state([]);
  let selectedIds = $state<Set<string>>(new Set());
  let editingTitle = $state<string | null>(null);
  let editingTitleValue = $state('');
  let savingTrack = $state<string | null>(null);
  let flashTrack = $state<string | null>(null);
  let batchAction = $state<'category' | 'tags' | null>(null);
  let batchPayload = $state('');

  $effect(() => {
    trackRows = data.tracks.map(t => ({ ...t }));
  });

  let allSelected = $derived(trackRows.length > 0 && selectedIds.size === trackRows.length);

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    selectedIds = next;
  }

  function toggleSelectAll() {
    if (allSelected) {
      selectedIds = new Set();
    } else {
      selectedIds = new Set(trackRows.map(t => t.id));
    }
  }

  function startEditTitle(track: TrackRow) {
    editingTitle = track.id;
    editingTitleValue = track.title;
  }

  async function saveTitle(track: TrackRow) {
    const newTitle = editingTitleValue.trim();
    if (!newTitle || newTitle === track.title) { editingTitle = null; return; }
    savingTrack = track.id;
    const res = await fetch(`${base}/api/tracks/${track.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    savingTrack = null;
    if (res.ok) {
      const idx = trackRows.findIndex(t => t.id === track.id);
      if (idx !== -1) trackRows[idx].title = newTitle;
      flashSuccess(track.id);
    }
    editingTitle = null;
  }

  function flashSuccess(id: string) {
    flashTrack = id;
    setTimeout(() => { flashTrack = null; }, 600);
  }

  function handleTitleKeydown(e: KeyboardEvent, track: TrackRow) {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
    if (e.key === 'Escape') { editingTitle = null; }
  }

  async function executeBatch(action: string, payload?: string) {
    const ids = [...selectedIds];
    if (action === 'delete' && !confirm(`Delete ${ids.length} track(s)? This cannot be undone.`)) return;

    const res = await fetch(`${base}/api/tracks/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, trackIds: ids, payload }),
    });

    if (res.ok) {
      if (action === 'delete') {
        trackRows = trackRows.filter(t => !selectedIds.has(t.id));
      } else if (action === 'setCategory' && payload) {
        trackRows = trackRows.map(t => selectedIds.has(t.id) ? { ...t, category: payload } : t);
      }
      selectedIds = new Set();
      batchAction = null;
      batchPayload = '';
    }
  }
</script>

<svelte:head>
  <title>Track Management - wallybrain admin</title>
</svelte:head>

<h1 class="text-2xl font-bold text-text-primary mb-2">Tracks</h1>

{#if data.tracks.length === 0}
  <div class="text-center py-12">
    <p class="text-text-muted mb-4">No tracks uploaded yet.</p>
    <a
      href="{base}/admin/upload"
      class="text-accent-muted hover:text-accent-muted-hover transition-colors"
    >
      Upload your first track
    </a>
  </div>
{:else}
  <div class="space-y-2">
    <!-- Header with select all -->
    <div class="flex items-center gap-4 px-3 py-1.5">
      <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} class="accent-accent rounded" />
      <span class="text-xs text-text-muted font-mono uppercase tracking-wider">{data.tracks.length} tracks</span>
    </div>

    {#each trackRows as track (track.id)}
      <div class="flex items-center gap-4 p-3 rounded-lg bg-surface-raised transition-colors {flashTrack === track.id ? 'flash-success' : ''} {savingTrack === track.id ? 'opacity-60' : ''}">
        <!-- Checkbox -->
        <input type="checkbox" checked={selectedIds.has(track.id)} onchange={() => toggleSelect(track.id)} class="accent-accent rounded shrink-0" />

        <!-- Cover art -->
        <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />

        <!-- Title (inline editable) -->
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
              onclick={() => startEditTitle(track)}
              class="text-text-secondary font-medium truncate cursor-text hover:text-accent-muted transition-colors text-left w-full bg-transparent border-none p-0 text-sm"
              title="Click to edit title"
            >{track.title}</button>
          {/if}
          {#if track.status === 'failed' && track.errorMessage}
            <p class="text-xs text-red-400/70 truncate">{track.errorMessage}</p>
          {/if}
        </div>

        <!-- Status -->
        <span class="px-2 py-0.5 rounded text-xs font-medium {statusColors[track.status] || 'text-text-tertiary'} shrink-0">
          {track.status}
        </span>

        <!-- Edit link -->
        <a href="{base}/admin/tracks/{track.id}" class="text-text-muted hover:text-accent-muted transition-colors shrink-0 text-sm" title="Edit details">&#x270E;</a>
      </div>
    {/each}
  </div>
{/if}

<!-- Floating batch action bar -->
{#if selectedIds.size > 0}
  <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[400] metal-panel rounded-lg px-5 py-3 flex items-center gap-4">
    <span class="text-sm text-text-secondary font-mono">{selectedIds.size} selected</span>

    <div class="h-4 w-px bg-border-default"></div>

    {#if batchAction === 'category'}
      <select
        class="bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
        onchange={(e) => { executeBatch('setCategory', (e.target as HTMLSelectElement).value); }}
      >
        <option value="" disabled selected>Pick category...</option>
        {#each ['track', 'set', 'experiment', 'export'] as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
      <button onclick={() => batchAction = null} class="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
    {:else if batchAction === 'tags'}
      <input
        type="text"
        placeholder="tag1, tag2..."
        bind:value={batchPayload}
        onkeydown={(e) => { if (e.key === 'Enter' && batchPayload.trim()) executeBatch('addTags', batchPayload); if (e.key === 'Escape') batchAction = null; }}
        class="bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-xs text-text-secondary w-40 focus:border-accent focus:outline-none"
        autofocus
      />
      <button onclick={() => { if (batchPayload.trim()) executeBatch('addTags', batchPayload); }} class="text-xs text-accent-muted hover:text-accent-muted-hover">Add</button>
      <button onclick={() => batchAction = null} class="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
    {:else}
      <button onclick={() => batchAction = 'category'} class="text-xs text-accent-muted hover:text-accent-muted-hover font-mono uppercase tracking-wider">Category</button>
      <button onclick={() => { batchAction = 'tags'; batchPayload = ''; }} class="text-xs text-accent-muted hover:text-accent-muted-hover font-mono uppercase tracking-wider">Tags</button>
      <button onclick={() => executeBatch('delete')} class="text-xs text-red-400 hover:text-red-300 font-mono uppercase tracking-wider">Delete</button>
    {/if}
  </div>
{/if}

<style>
  .flash-success {
    animation: flash-green 0.6s ease-out;
  }
  @keyframes flash-green {
    0% { background-color: rgba(16, 185, 129, 0.25); }
    100% { background-color: transparent; }
  }
</style>
