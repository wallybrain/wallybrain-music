<script lang="ts">
  import CoverArt from './CoverArt.svelte';
  import { formatTime } from '$lib/utils/formatTime';
  import { base } from '$app/paths';

  const typeBadge: Record<string, string> = {
    album: 'bg-purple-500/20 text-purple-400',
    playlist: 'bg-blue-500/20 text-blue-400',
  };

  let { collection, mode = 'grid' }: {
    collection: {
      id: string;
      slug: string;
      title: string;
      type: string;
      artPath: string | null;
      dominantColor: string | null;
      trackCount: number;
      totalDuration: number;
    };
    mode?: 'list' | 'grid';
  } = $props();
</script>

{#if mode === 'list'}
  <a
    href="{base}/collection/{collection.slug}"
    class="flex items-center gap-4 p-3 rounded-lg metal-panel transition-all duration-200 hover:scale-[1.01] group"
  >
    <CoverArt
      trackId={collection.id}
      artPath={collection.artPath}
      title={collection.title}
      size="sm"
      entityType="collections"
    />
    <div class="flex-1 min-w-0">
      <h2 class="text-text-secondary font-medium truncate group-hover:text-text-primary transition-colors">
        {collection.title}
      </h2>
      <div class="flex items-center gap-3 text-xs text-text-muted mt-1">
        <span class="px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider {typeBadge[collection.type] ?? ''}">
          {collection.type}
        </span>
        {#if collection.trackCount > 0}
          <span>{collection.trackCount} track{collection.trackCount === 1 ? '' : 's'}</span>
        {/if}
        {#if collection.totalDuration > 0}
          <span class="font-mono tabular-nums">{formatTime(collection.totalDuration)}</span>
        {/if}
      </div>
    </div>
  </a>
{:else}
  <a
    href="{base}/collection/{collection.slug}"
    class="flex flex-col rounded-lg metal-panel transition-all overflow-hidden group hover:brightness-110 hover:scale-[1.02]"
  >
    <div class="relative aspect-square overflow-hidden rounded-t-lg">
      <CoverArt
        trackId={collection.id}
        artPath={collection.artPath}
        title={collection.title}
        size="lg"
        dominantColor={collection.dominantColor}
        entityType="collections"
      />
    </div>

    <div class="p-3">
      <h2 class="text-sm font-medium text-text-secondary truncate group-hover:text-text-primary transition-colors">
        {collection.title}
      </h2>
      <div class="flex items-center gap-2 text-xs text-text-muted mt-1">
        <span class="px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider {typeBadge[collection.type] ?? ''}">
          {collection.type}
        </span>
        {#if collection.trackCount > 0}
          <span>{collection.trackCount} track{collection.trackCount === 1 ? '' : 's'}</span>
        {/if}
        {#if collection.totalDuration > 0}
          <span class="font-mono tabular-nums">{formatTime(collection.totalDuration)}</span>
        {/if}
      </div>
    </div>
  </a>
{/if}
