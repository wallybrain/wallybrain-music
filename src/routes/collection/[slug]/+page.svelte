<script lang="ts">
  import TrackCard from '$lib/components/TrackCard.svelte';
  import CoverArt from '$lib/components/CoverArt.svelte';
  import { base } from '$app/paths';
  import { formatTime } from '$lib/utils/formatTime';
  import { playerState, type QueueTrack } from '$lib/stores/playerState.svelte';
  import { onMount } from 'svelte';

  let { data } = $props();

  // --- View mode state ---
  let queueTracks = $derived<QueueTrack[]>(data.tracks.map(t => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    duration: t.duration ?? 0,
    artPath: t.artPath,
  })));

  let isThisPlaying = $derived(
    playerState.isPlaying &&
    playerState.queue.length === queueTracks.length &&
    playerState.queue[0]?.id === queueTracks[0]?.id
  );

  function togglePlayAll() {
    if (isThisPlaying) {
      playerState.togglePlayPause();
    } else if (queueTracks.length > 0) {
      playerState.play(queueTracks[0], queueTracks, 0);
    }
  }

  // --- Edit mode state ---
  let editing = $state(false);
  let sortableInstance: any;
  let trackListEl: HTMLDivElement | undefined = $state();

  type TrackItem = {
    id: string;
    title: string;
    slug: string;
    duration: number | null;
    artPath: string | null;
    playCount: number;
    category: string;
    dominantColor: string | null;
    tags: string[];
    position: number;
  };

  let trackList: TrackItem[] = $state([]);

  // Album metadata edit state
  let editTitle = $state('');
  let editDescription = $state('');
  let editArtist = $state('');

  // Track inline edit state
  let editingTrackTitle = $state<string | null>(null);
  let editingTrackTitleValue = $state('');
  let savingTrack = $state<string | null>(null);
  let flashTrack = $state<string | null>(null);
  let confirmingRemove = $state<string | null>(null);

  // Search-to-add state
  let showAddTrack = $state(false);
  let searchQuery = $state('');
  let searchResults = $state<Array<{id: string, title: string, duration: number | null, artPath: string | null}>>([]);
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  // Toast
  let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    toast = { message, type };
    if (type === 'success') setTimeout(() => { toast = null; }, 2000);
  }

  $effect(() => {
    trackList = data.tracks.map(t => ({ ...t }));
  });

  function enterEditMode() {
    editing = true;
    editTitle = data.collection.title;
    editDescription = data.collection.description || '';
    editArtist = data.collection.artist || '';
    // Init SortableJS after DOM updates
    requestAnimationFrame(async () => {
      const { default: Sortable } = await import('sortablejs');
      if (trackListEl) {
        sortableInstance = Sortable.create(trackListEl, {
          handle: '.drag-handle',
          animation: 150,
          ghostClass: 'opacity-30',
          onEnd: async (evt: any) => {
            const item = trackList.splice(evt.oldIndex!, 1)[0];
            trackList.splice(evt.newIndex!, 0, item);
            const positions = trackList.map((t, i) => ({ trackId: t.id, position: i }));
            const res = await fetch(`${base}/api/collections/${data.collection.id}/tracks/reorder`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ positions }),
            });
            if (res.ok) {
              showToast('Order saved');
            } else {
              showToast('Failed to save order', 'error');
            }
          },
        });
      }
    });
  }

  function exitEditMode() {
    editing = false;
    sortableInstance?.destroy();
    sortableInstance = undefined;
    confirmingRemove = null;
    editingTrackTitle = null;
    showAddTrack = false;
    searchQuery = '';
    searchResults = [];
  }

  // --- Album metadata save ---
  async function saveAlbumInfo() {
    const res = await fetch(`${base}/api/collections/${data.collection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDescription,
        artist: editArtist,
      }),
    });
    if (res.ok) {
      showToast('Album info saved');
      setTimeout(() => location.reload(), 500);
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed to save' }));
      showToast(err.error || 'Failed to save', 'error');
    }
  }

  // --- Track inline editing ---
  function startEditTrackTitle(track: TrackItem) {
    editingTrackTitle = track.id;
    editingTrackTitleValue = track.title;
  }

  async function saveTrackTitle(track: TrackItem) {
    const newTitle = editingTrackTitleValue.trim();
    if (!newTitle || newTitle === track.title) { editingTrackTitle = null; return; }
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
    editingTrackTitle = null;
  }

  function handleTrackTitleKeydown(e: KeyboardEvent, track: TrackItem) {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
    if (e.key === 'Escape') { editingTrackTitle = null; }
  }

  function flashSuccess(id: string) {
    flashTrack = id;
    setTimeout(() => { flashTrack = null; }, 600);
  }

  // --- Remove track ---
  async function removeTrack(trackId: string) {
    const res = await fetch(`${base}/api/collections/${data.collection.id}/tracks/${trackId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      trackList = trackList.filter(t => t.id !== trackId);
      showToast('Track removed');
    }
    confirmingRemove = null;
  }

  // --- Search to add ---
  async function searchTracks(query: string) {
    if (query.length < 1) { searchResults = []; return; }
    const res = await fetch(`${base}/api/tracks/search?q=${encodeURIComponent(query)}&exclude=${data.collection.id}`);
    if (res.ok) searchResults = await res.json();
  }

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    searchQuery = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchTracks(value), 300);
  }

  async function addTrackToCollection(result: {id: string, title: string, duration: number | null, artPath: string | null}) {
    const res = await fetch(`${base}/api/collections/${data.collection.id}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId: result.id }),
    });
    if (res.ok) {
      const { position } = await res.json();
      trackList = [...trackList, { ...result, slug: '', playCount: 0, category: 'track', dominantColor: null, tags: [], position }];
      searchQuery = '';
      searchResults = [];
      showAddTrack = false;
      showToast('Track added');
    }
  }
</script>

<svelte:head>
  <title>{data.collection.title} - wallybrain</title>
  <meta name="description" content={data.collection.description || `Listen to ${data.collection.title} — a ${data.collection.trackCount}-track ${data.collection.type} by wallybrain. Stream free with interactive waveform player.`} />
  <link rel="canonical" href={`https://wallybrain.net/collection/${data.collection.slug}`} />

  <!-- Open Graph -->
  <meta property="og:title" content={data.collection.title} />
  <meta property="og:description" content={data.collection.description || `${data.collection.trackCount}-track ${data.collection.type} by wallybrain`} />
  <meta property="og:type" content="music.album" />
  <meta property="og:url" content={`https://wallybrain.net/collection/${data.collection.slug}`} />
  {#if data.collection.artPath}
    <meta property="og:image" content={`https://wallybrain.net/api/collections/${data.collection.id}/art`} />
  {/if}
  <meta property="og:site_name" content="wallybrain" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.collection.title} />
  <meta name="twitter:description" content={data.collection.description || `${data.collection.trackCount}-track ${data.collection.type} by wallybrain`} />
  {#if data.collection.artPath}
    <meta name="twitter:image" content={`https://wallybrain.net/collection/${data.collection.id}/art`} />
  {/if}

  <!-- Structured Data -->
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    "name": data.collection.title,
    "url": `https://wallybrain.net/collection/${data.collection.slug}`,
    "numTracks": data.collection.trackCount,
    "byArtist": { "@type": "MusicGroup", "name": "wallybrain" },
    ...(data.collection.description ? { "description": data.collection.description } : {}),
    "track": data.tracks.map(t => ({
      "@type": "MusicRecording",
      "name": t.title,
      "url": `https://wallybrain.net/track/${t.slug}`,
      ...(t.duration ? { "duration": `PT${Math.floor(t.duration / 60)}M${Math.floor(t.duration % 60)}S` } : {})
    }))
  })}</script>`}
</svelte:head>

{#if toast}
  <div class="fixed top-4 right-4 z-[400] px-4 py-2 rounded-lg text-sm font-mono uppercase tracking-wider
    {toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}">
    {toast.message}
    {#if toast.type === 'error'}
      <button onclick={() => toast = null} class="ml-2 text-red-300 hover:text-red-200">&times;</button>
    {/if}
  </div>
{/if}

<div class="max-w-3xl mx-auto px-4 py-8">
  <!-- Collection header -->
  <div class="flex flex-col sm:flex-row gap-6 mb-8">
    <div class="shrink-0">
      <CoverArt
        trackId={data.collection.id}
        artPath={data.collection.artPath}
        title={data.collection.title}
        size="lg"
        dominantColor={data.collection.dominantColor}
        entityType="collections"
      />
    </div>
    <div class="flex flex-col justify-end gap-2 flex-1">
      {#if editing}
        <!-- Editable album info -->
        <div class="space-y-3">
          <div>
            <label class="text-xs font-mono uppercase tracking-widest text-accent-muted">Title</label>
            <input type="text" bind:value={editTitle}
              class="w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary text-xl font-bold focus:border-accent focus:outline-none" />
          </div>
          {#if data.collection.type === 'album'}
            <div>
              <label class="text-xs font-mono uppercase tracking-widest text-accent-muted">Artist</label>
              <input type="text" bind:value={editArtist}
                class="w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none" />
            </div>
          {/if}
          <div>
            <label class="text-xs font-mono uppercase tracking-widest text-accent-muted">Description</label>
            <textarea bind:value={editDescription} rows="2"
              class="w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary text-sm focus:border-accent focus:outline-none resize-y"></textarea>
          </div>
          <button onclick={saveAlbumInfo}
            class="bg-accent hover:bg-accent-hover text-text-primary px-5 py-2 rounded-lg font-medium transition-colors w-fit text-sm">
            Save Album Info
          </button>
        </div>
      {:else}
        <span class="text-xs uppercase tracking-wider text-text-muted">
          {data.collection.type}
        </span>
        <h1 class="text-3xl font-bold text-text-primary">{data.collection.title}</h1>
        {#if data.collection.artist}
          <p class="text-text-secondary">{data.collection.artist}</p>
        {/if}
        {#if data.collection.description}
          <p class="text-text-muted text-sm mt-1">{data.collection.description}</p>
        {/if}
        <div class="flex items-center gap-4 text-sm text-text-muted mt-2">
          <span>{data.tracks.length} tracks</span>
          {#if data.collection.totalDuration}
            <span class="font-mono tabular-nums">{formatTime(data.collection.totalDuration)}</span>
          {/if}
        </div>
        <div class="flex items-center gap-3 mt-3">
          {#if queueTracks.length > 0}
            <button onclick={togglePlayAll}
              class="bg-accent hover:bg-accent-hover text-text-primary px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
              {#if isThisPlaying}
                <span>&#9646;&#9646;</span> Pause
              {:else}
                <span>&#9654;</span> Play All
              {/if}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Edit mode toggle (only for authenticated users) -->
  {#if data.canEdit}
    <div class="flex items-center justify-between mb-4">
      {#if editing}
        <span class="text-xs font-mono uppercase tracking-widest text-accent-muted">Editing — drag to reorder, click titles to rename</span>
        <button onclick={exitEditMode}
          class="text-sm text-text-muted hover:text-text-secondary font-mono uppercase tracking-wider transition-colors">
          Done Editing
        </button>
      {:else}
        <span></span>
        <button onclick={enterEditMode}
          class="text-sm text-accent-muted hover:text-accent-muted-hover font-mono uppercase tracking-wider transition-colors">
          &#x270E; Edit Album
        </button>
      {/if}
    </div>
  {/if}

  <!-- Track list -->
  {#if editing}
    <!-- Edit mode track list -->
    {#if trackList.length === 0}
      <p class="text-text-muted">No tracks yet. Use "Add Track" below.</p>
    {:else}
      <div class="space-y-2" bind:this={trackListEl}>
        {#each trackList as track, i (track.id)}
          <div
            data-id={track.id}
            class="flex items-center gap-3 p-3 rounded-lg metal-panel transition-colors {flashTrack === track.id ? 'flash-success' : ''} {savingTrack === track.id ? 'opacity-60' : ''}"
          >
            <!-- Drag handle -->
            <span class="drag-handle cursor-grab text-text-muted hover:text-text-secondary text-lg select-none shrink-0" title="Drag to reorder">&#x2837;</span>

            <!-- Position -->
            <span class="text-xs text-text-muted font-mono w-6 text-right shrink-0">{i + 1}</span>

            <!-- Art -->
            <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />

            <!-- Title (editable) -->
            <div class="flex-1 min-w-0">
              {#if editingTrackTitle === track.id}
                <input
                  type="text"
                  bind:value={editingTrackTitleValue}
                  onblur={() => saveTrackTitle(track)}
                  onkeydown={(e) => handleTrackTitleKeydown(e, track)}
                  class="bg-surface-overlay border border-accent rounded px-2 py-0.5 text-text-secondary font-medium text-sm w-full focus:outline-none"
                  autofocus
                />
              {:else}
                <button
                  type="button"
                  onclick={() => startEditTrackTitle(track)}
                  class="text-text-secondary font-medium truncate cursor-text hover:text-accent-muted transition-colors text-left w-full bg-transparent border-none p-0 text-sm"
                  title="Click to edit title"
                >{track.title}</button>
              {/if}
              {#if track.duration}
                <p class="text-xs text-text-muted font-mono tabular-nums">{formatTime(track.duration)}</p>
              {/if}
            </div>

            <!-- Remove -->
            {#if confirmingRemove === track.id}
              <span class="flex items-center gap-1 shrink-0 text-xs">
                <span class="text-text-muted">Remove?</span>
                <button onclick={() => removeTrack(track.id)} class="text-red-400 hover:text-red-300 font-medium px-1">Yes</button>
                <button onclick={() => confirmingRemove = null} class="text-text-muted hover:text-text-secondary font-medium px-1">No</button>
              </span>
            {:else}
              <button onclick={() => confirmingRemove = track.id}
                class="text-text-muted hover:text-red-400 transition-colors shrink-0 text-sm" title="Remove from album">&times;</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Add Track search -->
    <div class="mt-4 relative">
      {#if !showAddTrack}
        <button onclick={() => { showAddTrack = true; searchQuery = ''; searchResults = []; }}
          class="text-sm text-accent-muted hover:text-accent-muted-hover transition-colors font-mono uppercase tracking-wider">
          + Add Track
        </button>
      {:else}
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <input type="text" placeholder="Search tracks to add..."
              value={searchQuery}
              oninput={handleSearchInput}
              class="flex-1 bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-sm text-text-secondary focus:border-accent focus:outline-none"
              autofocus
              onkeydown={(e) => { if (e.key === 'Escape') { showAddTrack = false; } }}
            />
            <button onclick={() => { showAddTrack = false; }} class="text-text-muted hover:text-text-secondary text-sm">&times;</button>
          </div>
          {#if searchResults.length > 0}
            <div class="absolute left-0 right-0 bg-surface-raised border border-border-default rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
              {#each searchResults as result (result.id)}
                <button onclick={() => addTrackToCollection(result)}
                  class="w-full flex items-center gap-3 p-2.5 hover:bg-surface-hover transition-colors text-left">
                  <div class="w-8 h-8 bg-surface-overlay rounded flex items-center justify-center text-text-muted text-xs shrink-0">
                    {#if result.artPath}
                      <img src="{base}/api/tracks/{result.id}/art" alt="" class="w-8 h-8 rounded object-cover" />
                    {:else}
                      &#9835;
                    {/if}
                  </div>
                  <span class="text-sm text-text-secondary flex-1 truncate">{result.title}</span>
                  {#if result.duration}
                    <span class="text-xs text-text-muted font-mono tabular-nums shrink-0">{formatTime(result.duration)}</span>
                  {/if}
                </button>
              {/each}
            </div>
          {:else if searchQuery.length > 0}
            <div class="absolute left-0 right-0 bg-surface-raised border border-border-default rounded-lg p-3 text-sm text-text-muted text-center z-10">
              No tracks found
            </div>
          {/if}
        </div>
      {/if}
    </div>

  {:else}
    <!-- Normal view mode track list -->
    {#if data.tracks.length === 0}
      <p class="text-text-muted">No tracks available yet.</p>
    {:else}
      <div class="space-y-3">
        {#each data.tracks as track, i (track.id)}
          <TrackCard {track} allTracks={queueTracks} index={i} />
        {/each}
      </div>
    {/if}
  {/if}

  <div class="mt-8">
    <a href="{base}/" class="text-text-muted hover:text-text-secondary text-sm transition-colors">
      &larr; Back to all tracks
    </a>
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
