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
</script>

<svelte:head>
  <title>Track Management - wallybrain admin</title>
</svelte:head>

<div class="flex justify-between items-center mb-2">
  <h1 class="text-2xl font-bold text-text-primary">Track Management</h1>
  <a
    href="{base}/admin/upload"
    class="bg-accent hover:bg-accent-hover text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
  >
    Upload
  </a>
</div>

<p class="text-text-muted text-sm mb-4">{data.tracks.length} tracks</p>

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
    {#each data.tracks as track (track.id)}
      <a
        href="{base}/admin/tracks/{track.id}"
        class="flex items-center gap-4 p-3 rounded-lg bg-surface-raised hover:bg-surface-hover transition-colors"
      >
        <CoverArt trackId={track.id} artPath={track.artPath} title={track.title} size="sm" />
        <div class="flex-1 min-w-0">
          <p class="text-text-secondary font-medium truncate">{track.title}</p>
          <p class="text-xs uppercase tracking-wider text-text-muted">{track.category}</p>
          {#if track.status === 'failed' && track.errorMessage}
            <p class="text-xs text-red-400/70 truncate">{track.errorMessage}</p>
          {/if}
        </div>
        <span class="px-2 py-0.5 rounded text-xs font-medium {statusColors[track.status] || 'text-text-tertiary'}">
          {track.status}
        </span>
      </a>
    {/each}
  </div>
{/if}
