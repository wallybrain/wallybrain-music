<script lang="ts">
  import { base } from '$app/paths';

  type UploadMode = 'single' | 'album' | 'playlist';

  type UploadEntry = {
    file: File;
    trackId: string | null;
    status: 'uploading' | 'pending' | 'processing' | 'ready' | 'failed';
    error: string | null;
  };

  let mode: UploadMode = $state('single');
  let isDragging = $state(false);
  let uploads: UploadEntry[] = $state([]);
  let fileInput: HTMLInputElement;

  // Collection metadata
  let collectionTitle = $state('');
  let collectionDescription = $state('');
  let collectionArtist = $state('');
  let collectionArtFile: File | null = $state(null);
  let collectionId: string | null = $state(null);
  let collectionSlug: string | null = $state(null);
  let collectionCreating = $state(false);
  let collectionError: string | null = $state(null);

  let isCollectionMode = $derived(mode === 'album' || mode === 'playlist');
  let canDrop = $derived(mode === 'single' || !isCollectionMode || collectionTitle.trim().length > 0);

  const statusColors: Record<string, string> = {
    uploading: 'bg-accent/20 text-accent-muted',
    pending: 'bg-surface-hover/50 text-text-tertiary',
    processing: 'bg-amber-500/20 text-amber-400',
    ready: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (!canDrop) return;
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && canDrop) {
      handleFiles(input.files);
      input.value = '';
    }
  }

  function handleArtSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
      collectionArtFile = input.files[0];
    }
  }

  async function ensureCollection(): Promise<string | null> {
    if (collectionId) return collectionId;

    collectionCreating = true;
    collectionError = null;

    try {
      const res = await fetch(`${base}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: collectionTitle.trim(),
          description: collectionDescription.trim() || null,
          type: mode,
          artist: mode === 'album' ? collectionArtist.trim() || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        collectionError = data.error || 'Failed to create collection';
        return null;
      }

      collectionId = data.collectionId;
      collectionSlug = data.slug;

      // Upload cover art if provided
      if (collectionArtFile && collectionId) {
        const artForm = new FormData();
        artForm.append('coverArt', collectionArtFile);
        await fetch(`${base}/api/collections/${collectionId}/art`, {
          method: 'POST',
          body: artForm,
        });
      }

      return collectionId;
    } catch {
      collectionError = 'Network error creating collection';
      return null;
    } finally {
      collectionCreating = false;
    }
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);

    // Create collection first if needed
    let activeCollectionId: string | null = null;
    if (isCollectionMode) {
      activeCollectionId = await ensureCollection();
      if (!activeCollectionId) return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const entry: UploadEntry = { file, trackId: null, status: 'uploading', error: null };
      uploads = [...uploads, entry];
      const index = uploads.length - 1;

      try {
        const formData = new FormData();
        formData.append('audio', file);

        const response = await fetch(`${base}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          uploads[index] = { ...uploads[index], status: 'failed', error: data.error || 'Upload failed' };
        } else {
          uploads[index] = { ...uploads[index], trackId: data.trackId, status: 'pending' };

          // Associate track to collection
          if (activeCollectionId && data.trackId) {
            await fetch(`${base}/api/collections/${activeCollectionId}/tracks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trackId: data.trackId, position: i }),
            });
          }
        }
      } catch {
        uploads[index] = { ...uploads[index], status: 'failed', error: 'Network error' };
      }
    }
  }

  $effect(() => {
    const active = uploads.filter(
      (u) => u.trackId && (u.status === 'pending' || u.status === 'processing')
    );

    if (active.length === 0) return;

    const interval = setInterval(async () => {
      for (const upload of active) {
        if (!upload.trackId) continue;
        try {
          const res = await fetch(`${base}/api/tracks/${upload.trackId}/status`);
          if (!res.ok) continue;
          const data = await res.json();
          const idx = uploads.findIndex((u) => u.trackId === upload.trackId);
          if (idx !== -1) {
            uploads[idx] = {
              ...uploads[idx],
              status: data.status,
              error: data.errorMessage || null,
            };
          }
        } catch {
          // ignore polling errors
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Upload - wallybrain admin</title>
</svelte:head>

<a href="{base}/admin" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block transition-colors">
  &larr; Back to admin
</a>

<h1 class="text-2xl font-bold text-text-primary mb-1">Upload Tracks</h1>
<p class="text-text-muted text-sm mb-6">Supports MP3, WAV, FLAC, OGG, and AIFF files</p>

<!-- Mode selector -->
<div class="flex gap-1 p-1 bg-surface-overlay rounded-lg mb-6 w-fit">
  {#each [['single', 'Single'], ['album', 'Album'], ['playlist', 'Playlist']] as [value, label]}
    <button
      onclick={() => { mode = value as UploadMode; collectionId = null; collectionSlug = null; collectionError = null; }}
      class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors {mode === value
        ? 'bg-surface-hover text-text-primary'
        : 'text-text-muted hover:text-text-secondary'}"
    >
      {label}
    </button>
  {/each}
</div>

<!-- Collection metadata form -->
{#if isCollectionMode}
  <div class="metal-panel rounded-lg p-5 mb-6 space-y-4">
    <h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">
      {mode === 'album' ? 'Album' : 'Playlist'} Details
    </h2>

    {#if collectionError}
      <p class="text-red-400 text-sm">{collectionError}</p>
    {/if}

    {#if collectionId}
      <div class="flex items-center gap-2 text-sm text-emerald-400">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
        {mode === 'album' ? 'Album' : 'Playlist'} created
        {#if collectionSlug}
          <a href="{base}/admin/collections/{collectionId}" class="text-accent-muted hover:text-accent-muted-hover underline underline-offset-2 ml-1">Edit</a>
        {/if}
      </div>
    {/if}

    <div class="space-y-1">
      <label for="collectionTitle" class="text-sm text-text-tertiary">Title *</label>
      <input
        type="text"
        id="collectionTitle"
        bind:value={collectionTitle}
        disabled={!!collectionId}
        placeholder="{mode === 'album' ? 'Album' : 'Playlist'} title"
        class="w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none disabled:opacity-50"
      />
    </div>

    {#if mode === 'album'}
      <div class="space-y-1">
        <label for="collectionArtist" class="text-sm text-text-tertiary">Artist</label>
        <input
          type="text"
          id="collectionArtist"
          bind:value={collectionArtist}
          disabled={!!collectionId}
          placeholder="Artist name"
          class="w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none disabled:opacity-50"
        />
      </div>
    {/if}

    <div class="space-y-1">
      <label for="collectionDescription" class="text-sm text-text-tertiary">Description</label>
      <textarea
        id="collectionDescription"
        bind:value={collectionDescription}
        disabled={!!collectionId}
        rows="2"
        placeholder="Optional description"
        class="w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none resize-y disabled:opacity-50"
      ></textarea>
    </div>

    <div class="space-y-1">
      <label for="collectionArt" class="text-sm text-text-tertiary">Cover Art</label>
      <input
        type="file"
        id="collectionArt"
        accept="image/*"
        disabled={!!collectionId}
        onchange={handleArtSelect}
        class="text-sm text-text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-overlay file:text-text-secondary hover:file:bg-surface-hover disabled:opacity-50"
      />
    </div>
  </div>
{/if}

<!-- Drop zone -->
<div
  role="button"
  tabindex="0"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  class="border-2 border-dashed rounded-lg p-12 text-center transition-colors {!canDrop
    ? 'border-border-default opacity-50 cursor-not-allowed'
    : isDragging
      ? 'border-accent bg-accent/10'
      : 'border-border-default hover:border-text-muted'}"
>
  {#if !canDrop}
    <p class="text-text-muted">Enter a title above before uploading tracks</p>
  {:else if collectionCreating}
    <p class="text-text-muted animate-pulse">Creating {mode}...</p>
  {:else}
    <p class="text-text-tertiary mb-3">Drag audio files here or</p>
    <button
      onclick={() => canDrop && fileInput.click()}
      class="bg-surface-hover hover:bg-surface-hover text-text-secondary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      Browse files
    </button>
  {/if}
  <input
    bind:this={fileInput}
    type="file"
    accept="audio/*"
    multiple
    onchange={handleFileSelect}
    class="hidden"
  />
</div>

{#if uploads.length > 0}
  <div class="mt-8 space-y-3">
    {#each uploads as upload, i (i)}
      <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-raised">
        {#if isCollectionMode}
          <span class="text-xs text-text-muted font-mono w-6 text-right shrink-0">{i + 1}</span>
        {/if}
        <div class="flex-1 min-w-0">
          <p class="text-text-secondary text-sm font-medium truncate">{upload.file.name}</p>
          {#if upload.status === 'failed' && upload.error}
            <p class="text-xs text-red-400/70 mt-0.5">{upload.error}</p>
          {/if}
          {#if upload.status === 'ready' && upload.trackId}
            <a
              href="{base}/admin/tracks/{upload.trackId}"
              class="text-xs text-accent-muted hover:text-accent-muted-hover transition-colors mt-0.5 inline-block"
            >
              Edit metadata
            </a>
          {/if}
        </div>
        <span
          class="px-2 py-0.5 rounded text-xs font-medium {statusColors[upload.status]} {upload.status === 'uploading' ? 'animate-pulse' : ''}"
        >
          {upload.status}
        </span>
      </div>
    {/each}
  </div>
{/if}

{#if collectionId && collectionSlug && uploads.length > 0 && uploads.every(u => u.status === 'ready' || u.status === 'failed')}
  <div class="mt-6 flex gap-4">
    <a
      href="{base}/admin/collections/{collectionId}"
      class="bg-accent hover:bg-accent-hover text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
    >
      Edit {mode === 'album' ? 'Album' : 'Playlist'}
    </a>
    <a
      href="{base}/collection/{collectionSlug}"
      class="text-accent-muted hover:text-accent-muted-hover text-sm transition-colors flex items-center"
    >
      View public page &rarr;
    </a>
  </div>
{/if}
