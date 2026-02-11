<script lang="ts">
  import { base } from '$app/paths';
  import CoverArt from '$lib/components/CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';

  let { data } = $props();

  const typeBadge: Record<string, string> = {
    album: 'bg-purple-500/20 text-purple-400',
    playlist: 'bg-blue-500/20 text-blue-400',
  };
</script>

<svelte:head>
  <title>Collections - wallybrain admin</title>
</svelte:head>

<h1 class="text-2xl font-bold text-text-primary mb-2">Collections</h1>

<p class="text-text-muted text-sm mb-4">{data.collections.length} collections</p>

{#if data.collections.length === 0}
  <div class="text-center py-12">
    <p class="text-text-muted mb-4">No collections yet.</p>
    <a
      href="{base}/admin/upload"
      class="text-accent-muted hover:text-accent-muted-hover transition-colors"
    >
      Create one by uploading tracks as an album or playlist
    </a>
  </div>
{:else}
  <div class="space-y-2">
    {#each data.collections as collection (collection.id)}
      <a
        href="{base}/admin/collections/{collection.id}"
        class="flex items-center gap-4 p-3 rounded-lg bg-surface-raised hover:bg-surface-hover transition-colors"
      >
        <CoverArt trackId={collection.id} artPath={collection.artPath} title={collection.title} size="sm" entityType="collections" />
        <div class="flex-1 min-w-0">
          <p class="text-text-secondary font-medium truncate">{collection.title}</p>
          <div class="flex items-center gap-3 text-xs text-text-muted mt-0.5">
            <span>{collection.trackCount} tracks</span>
            {#if collection.totalDuration}
              <span class="font-mono tabular-nums">{formatTime(collection.totalDuration)}</span>
            {/if}
            {#if collection.artist}
              <span>{collection.artist}</span>
            {/if}
          </div>
        </div>
        <span class="px-2 py-0.5 rounded text-xs font-medium {typeBadge[collection.type] || 'text-text-tertiary'}">
          {collection.type}
        </span>
      </a>
    {/each}
  </div>
{/if}
