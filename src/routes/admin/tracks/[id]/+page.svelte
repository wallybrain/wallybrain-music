<script lang="ts">
  import { enhance } from '$app/forms';
  import { beforeNavigate } from '$app/navigation';
  import { base } from '$app/paths';
  import CoverArt from '$lib/components/CoverArt.svelte';

  let { data, form } = $props();

  let track = $derived(data.track);
  let tagString = $derived(data.tags.join(', '));

  const statusColors: Record<string, string> = {
    ready: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-amber-500/20 text-amber-400',
    pending: 'bg-surface-hover/50 text-text-tertiary',
    failed: 'bg-red-500/20 text-red-400',
  };

  const inputClasses = 'w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none';

  let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    toast = { message, type };
    if (type === 'success') {
      setTimeout(() => { toast = null; }, 2000);
    }
  }

  let dirty = $state(false);

  function markDirty() {
    dirty = true;
  }

  beforeNavigate(({ cancel }) => {
    if (dirty && !confirm('You have unsaved changes. Leave anyway?')) {
      cancel();
    }
  });
</script>

<svelte:window onbeforeunload={(e) => { if (dirty) { e.preventDefault(); } }} />

<svelte:head>
  <title>Edit: {track.title} - wallybrain admin</title>
</svelte:head>

{#if toast}
  <div class="fixed top-4 right-4 z-[10001] px-4 py-2 rounded-lg text-sm font-mono uppercase tracking-wider
    {toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}">
    {toast.message}
    {#if toast.type === 'error'}
      <button onclick={() => toast = null} class="ml-2 text-red-300 hover:text-red-200">&times;</button>
    {/if}
  </div>
{/if}

<a href="{base}/admin" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block transition-colors">
  &larr; Back to tracks
</a>

<div class="flex items-center gap-3 mb-6">
  <h1 class="text-xl font-bold text-text-primary">{track.title}</h1>
  <span class="px-2 py-0.5 rounded text-xs font-medium {statusColors[track.status] || 'text-text-tertiary'}">
    {track.status}
  </span>
</div>

<form method="POST" action="?/update" oninput={markDirty} use:enhance={() => {
  return async ({ result, update }) => {
    if (result.type === 'redirect') {
      showToast('Saved');
      dirty = false;
      return;
    } else if (result.type === 'failure') {
      showToast(result.data?.error || 'Save failed', 'error');
    }
    await update();
  };
}} enctype="multipart/form-data">
  {#if form?.error}
    <p class="text-red-400 text-sm mb-4">{form.error}</p>
  {/if}

  <div class="space-y-5">
    <!-- Metadata -->
    <h3 class="text-xs font-mono uppercase tracking-widest text-accent-muted mb-3">Metadata</h3>

    <div class="space-y-1">
      <label for="title" class="text-sm text-text-tertiary">Title</label>
      <input
        type="text"
        id="title"
        name="title"
        value={track.title}
        required
        class={inputClasses}
      />
    </div>

    <div class="space-y-1">
      <label for="slug" class="text-sm text-text-tertiary">Slug</label>
      <input
        type="text"
        id="slug"
        name="slug"
        value={track.slug}
        required
        class={inputClasses}
      />
      <p class="text-xs text-text-muted">URL: /track/{track.slug}</p>
    </div>

    <div class="space-y-1">
      <label for="description" class="text-sm text-text-tertiary">Description</label>
      <textarea
        id="description"
        name="description"
        rows="4"
        class="{inputClasses} resize-y"
      >{track.description || ''}</textarea>
    </div>

    <div class="space-y-1">
      <label for="category" class="text-sm text-text-tertiary">Category</label>
      <select id="category" name="category" class={inputClasses}>
        <option value="track" selected={track.category === 'track'}>track</option>
        <option value="set" selected={track.category === 'set'}>set</option>
        <option value="experiment" selected={track.category === 'experiment'}>experiment</option>
        <option value="export" selected={track.category === 'export'}>export</option>
        <option value="album" selected={track.category === 'album'}>album</option>
        <option value="playlist" selected={track.category === 'playlist'}>playlist</option>
      </select>
    </div>

    <hr class="border-border-subtle my-6" />

    <!-- Tags -->
    <h3 class="text-xs font-mono uppercase tracking-widest text-accent-muted mb-3">Tags</h3>

    <div class="space-y-1">
      <label for="tags" class="text-sm text-text-tertiary">Tags</label>
      <input
        type="text"
        id="tags"
        name="tags"
        value={tagString}
        class={inputClasses}
      />
      <p class="text-xs text-text-muted">Comma-separated, e.g.: ambient, techno, modular</p>
    </div>

    <hr class="border-border-subtle my-6" />

    <!-- Cover Art -->
    <h3 class="text-xs font-mono uppercase tracking-widest text-accent-muted mb-3">Cover Art</h3>

    <div class="space-y-2">
      <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="md" />
      <div class="flex items-center gap-3">
        <input
          type="file"
          id="coverArt"
          name="coverArt"
          accept="image/*"
          class="text-sm text-text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-overlay file:text-text-secondary hover:file:bg-surface-hover"
        />
        {#if track.artPath}
          <form method="POST" action="?/deleteArt" use:enhance={({ cancel }) => { if (!confirm('Remove cover art from this track?')) { cancel(); return; } }} class="inline">
            <button
              type="submit"
              class="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Remove Art
            </button>
          </form>
        {/if}
      </div>
    </div>

    <div class="mt-6 flex justify-end">
      <button
        type="submit"
        class="bg-accent hover:bg-accent-hover text-text-primary px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Save Changes
      </button>
    </div>
  </div>
</form>

{#if track.slug && track.status === 'ready'}
  <div class="mt-6">
    <a href="{base}/track/{track.slug}" class="text-accent-muted hover:text-accent-muted-hover text-sm transition-colors">
      View public page &rarr;
    </a>
  </div>
{/if}

<!-- Danger Zone -->
<div class="mt-12 border border-red-500/30 rounded-lg p-5">
  <h2 class="text-sm font-semibold text-red-400 mb-4">Danger Zone</h2>

  <div class="space-y-4">
    <!-- Replace Audio -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-text-secondary">Replace Audio</p>
        <p class="text-xs text-text-muted">Upload a new audio file. Metadata and art are preserved.</p>
      </div>
      <form method="POST" action="?/reupload" use:enhance={({ cancel }) => { if (!confirm('Replace the audio file? The track will be re-processed.')) { cancel(); return; } }} enctype="multipart/form-data" class="flex items-center gap-2 shrink-0">
        <input
          type="file"
          name="audioFile"
          accept="audio/*"
          required
          class="text-xs text-text-tertiary w-48 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-amber-500/20 file:text-amber-400 hover:file:bg-amber-500/30"
        />
        <button
          type="submit"
          class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          Reupload
        </button>
      </form>
    </div>

    <hr class="border-red-500/10" />

    <!-- Delete Track -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm text-text-secondary">Delete Track</p>
        <p class="text-xs text-text-muted">Permanently remove this track and all associated files.</p>
      </div>
      <form method="POST" action="?/delete" use:enhance={({ cancel }) => { if (!confirm('Permanently delete this track? This cannot be undone.')) { cancel(); return; } }} class="shrink-0">
        <button
          type="submit"
          class="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          Delete Track
        </button>
      </form>
    </div>
  </div>
</div>
