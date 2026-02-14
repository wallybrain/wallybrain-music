<script lang="ts">
  import { enhance } from '$app/forms';
  import { base } from '$app/paths';
  import CoverArt from '$lib/components/CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';

  let { data, form } = $props();

  let collection = $derived(data.collection);
  let orderedTracks = $derived(data.tracks);

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
{#if orderedTracks.length > 0}
  <div class="mt-8">
    <h2 class="text-lg font-semibold text-text-secondary mb-3">Tracks ({orderedTracks.length})</h2>
    <div class="space-y-2">
      {#each orderedTracks as track (track.id)}
        <a
          href="{base}/admin/tracks/{track.id}"
          class="flex items-center gap-3 p-3 rounded-lg bg-surface-raised hover:bg-surface-hover transition-colors"
        >
          <span class="text-xs text-text-muted font-mono w-6 text-right shrink-0">{track.position + 1}</span>
          <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />
          <div class="flex-1 min-w-0">
            <p class="text-text-secondary font-medium truncate">{track.title}</p>
            {#if track.duration}
              <p class="text-xs text-text-muted font-mono tabular-nums">{formatTime(track.duration)}</p>
            {/if}
          </div>
          <span class="px-2 py-0.5 rounded text-xs font-medium {statusColors[track.status] || 'text-text-tertiary'}">
            {track.status}
          </span>
        </a>
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
