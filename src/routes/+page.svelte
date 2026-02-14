<script lang="ts">
  import CollectionCard from '$lib/components/CollectionCard.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>wallybrain</title>
  <meta name="description" content="Electronic music by wallybrain" />
</svelte:head>

<div class="max-w-3xl mx-auto px-4 pt-2">
  {#if data.collections.length > 0}
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

  <div class="mt-6 h-8 rounded-lg border border-border-subtle/50 backdrop-blur-md bg-surface-base/80"></div>
</div>
