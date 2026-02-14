<script lang="ts">
  import CollectionCard from '$lib/components/CollectionCard.svelte';
  import { base } from '$app/paths';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  let { data } = $props();

  let reordering = $state(false);
  let gridEl: HTMLDivElement | undefined = $state();
  let sortableInstance: any;
  let collectionList = $state<typeof data.collections>([]);
  let toast = $state<{ message: string; type: 'success' | 'error' } | null>(null);

  $effect(() => {
    collectionList = data.collections.map(c => ({ ...c }));
  });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    toast = { message, type };
    if (type === 'success') setTimeout(() => { toast = null; }, 2000);
  }

  async function enterReorderMode() {
    reordering = true;
    requestAnimationFrame(async () => {
      const { default: Sortable } = await import('sortablejs');
      if (gridEl) {
        sortableInstance = Sortable.create(gridEl, {
          animation: 150,
          ghostClass: 'opacity-30',
          onEnd: async (evt: any) => {
            const item = collectionList.splice(evt.oldIndex!, 1)[0];
            collectionList.splice(evt.newIndex!, 0, item);
            const positions = collectionList.map((c, i) => ({ id: c.id, position: i }));
            const res = await fetch(`${base}/api/collections/reorder`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ positions }),
            });
            if (res.ok) {
              showToast('Order saved');
              invalidateAll();
            } else {
              showToast('Failed to save order', 'error');
            }
          },
        });
      }
    });
  }

  function exitReorderMode() {
    reordering = false;
    sortableInstance?.destroy();
    sortableInstance = undefined;
  }
</script>

<svelte:head>
  <title>wallybrain</title>
  <meta name="description" content="Electronic music by wallybrain" />
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

<div class="max-w-3xl mx-auto px-4 pt-2">
  {#if data.canEdit}
    <div class="flex items-center justify-end mb-3">
      {#if reordering}
        <span class="text-xs font-mono uppercase tracking-widest text-accent-muted mr-auto">Drag to reorder albums</span>
        <button onclick={exitReorderMode}
          class="text-sm text-text-muted hover:text-text-secondary font-mono uppercase tracking-wider transition-colors">
          Done
        </button>
      {:else}
        <button onclick={enterReorderMode}
          class="text-sm text-accent-muted hover:text-accent-muted-hover font-mono uppercase tracking-wider transition-colors">
          &#x2195; Reorder
        </button>
      {/if}
    </div>
  {/if}

  {#if reordering}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" bind:this={gridEl}>
      {#each collectionList as collection (collection.id)}
        <div data-id={collection.id} class="cursor-grab active:cursor-grabbing reorder-card">
          <div class="pointer-events-none">
            <CollectionCard {collection} mode="grid" />
          </div>
        </div>
      {/each}
    </div>
  {:else if data.collections.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {#each data.collections as collection (collection.id)}
        <CollectionCard {collection} mode="grid" />
      {/each}
    </div>
  {:else}
    <div class="text-center py-12">
      <p class="text-text-muted">No releases yet.</p>
    </div>
  {/if}

  <div class="mt-6 logo-panel rounded-lg px-4 flex items-center justify-center" style="height: calc(clamp(3.5rem, 12vw, 7rem) + 1.5rem);">
    <span class="text-[10px] font-mono uppercase tracking-widest text-text-muted/40">{data.collections.length} release{data.collections.length === 1 ? '' : 's'}</span>
  </div>
</div>

<style>
  .reorder-card {
    transition: transform 0.15s ease;
  }
  .reorder-card:hover {
    transform: scale(1.03);
  }
</style>
