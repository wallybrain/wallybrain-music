<script lang="ts">
  import { goto } from '$app/navigation';

  let {
    availableTags,
    activeCategory,
    activeTags,
  }: {
    availableTags: string[];
    activeCategory: string | null;
    activeTags: string[];
  } = $props();

  const categories = [
    { value: null, label: 'All' },
    { value: 'track', label: 'Finished' },
    { value: 'set', label: 'Sets' },
    { value: 'experiment', label: 'Experiments' },
    { value: 'export', label: 'Exports' },
    { value: 'album', label: 'Albums' },
    { value: 'playlist', label: 'Playlists' },
  ];

  let hasActiveFilters = $derived(activeCategory !== null || activeTags.length > 0);

  function buildUrl(category: string | null, tags: string[]) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    for (const tag of tags) params.append('tag', tag);
    const search = params.toString();
    return search ? `?${search}` : '?';
  }

  function selectCategory(value: string | null) {
    goto(buildUrl(value, activeTags), { replaceState: true, keepFocus: true });
  }

  function toggleTag(tagName: string) {
    const newTags = activeTags.includes(tagName)
      ? activeTags.filter(t => t !== tagName)
      : [...activeTags, tagName];
    goto(buildUrl(activeCategory, newTags), { replaceState: true, keepFocus: true });
  }

  function clearAll() {
    goto('?', { replaceState: true, keepFocus: true });
  }
</script>

<form method="GET" action="" class="space-y-3">
  <div class="flex flex-wrap items-center gap-2">
    {#each categories as cat}
      <button
        type="submit"
        name="category"
        value={cat.value ?? ''}
        onclick={(e) => { e.preventDefault(); selectCategory(cat.value); }}
        class="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-full transition-colors {activeCategory === cat.value
          ? 'bg-accent text-text-primary'
          : 'text-accent-muted hover:text-accent-muted-hover hover:bg-surface-overlay/50'}"
      >
        {cat.label}
      </button>
    {/each}
  </div>

  {#if availableTags.length > 0}
    <div class="flex flex-wrap items-center gap-2">
      {#each availableTags as tag}
        <button
          type="submit"
          name="tag"
          value={tag}
          onclick={(e) => { e.preventDefault(); toggleTag(tag); }}
          class="px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest rounded-full transition-colors {activeTags.includes(tag)
            ? 'bg-accent text-text-primary'
            : 'text-accent-muted hover:text-accent-muted-hover hover:bg-surface-overlay/50'}"
        >
          {tag}
        </button>
      {/each}
    </div>
  {/if}

  <noscript><button type="submit" class="px-3 py-1.5 text-sm bg-accent text-text-primary rounded">Filter</button></noscript>
</form>
