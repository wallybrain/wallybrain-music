<script lang="ts">
  import { enhance } from '$app/forms';
  import { base } from '$app/paths';
  import CoverArt from '$lib/components/CoverArt.svelte';

  let { data, form } = $props();
  // form is only populated on validation errors (success redirects to admin list)

  let track = $derived(data.track);
  let tagString = $derived(data.tags.join(', '));

  const statusColors: Record<string, string> = {
    ready: 'bg-emerald-500/20 text-emerald-400',
    processing: 'bg-amber-500/20 text-amber-400',
    pending: 'bg-surface-hover/50 text-text-tertiary',
    failed: 'bg-red-500/20 text-red-400',
  };

  const inputClasses = 'w-full bg-surface-overlay border border-border-default rounded-lg px-3 py-2 text-text-secondary focus:border-accent focus:outline-none';
</script>

<svelte:head>
  <title>Edit: {track.title} - wallybrain admin</title>
</svelte:head>

<a href="{base}/admin" class="text-text-muted hover:text-text-secondary text-sm mb-6 inline-block transition-colors">
  &larr; Back to tracks
</a>

<div class="flex items-center gap-3 mb-6">
  <h1 class="text-xl font-bold text-text-primary">{track.title}</h1>
  <span class="px-2 py-0.5 rounded text-xs font-medium {statusColors[track.status] || 'text-text-tertiary'}">
    {track.status}
  </span>
</div>

<form method="POST" action="?/update" use:enhance enctype="multipart/form-data">
  {#if form?.error}
    <p class="text-red-400 text-sm mb-4">{form.error}</p>
  {/if}

  <div class="space-y-5">
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

    <div class="space-y-2">
      <label for="coverArt" class="text-sm text-text-tertiary">Cover Art</label>
      <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="md" />
      <input
        type="file"
        id="coverArt"
        name="coverArt"
        accept="image/*"
        class="text-sm text-text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-surface-overlay file:text-text-secondary hover:file:bg-surface-hover"
      />
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
