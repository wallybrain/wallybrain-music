<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  let editingId = $state<number | null>(null);
  let editPlatform = $state('');
  let editUrl = $state('');
  let newPlatform = $state('');
  let newUrl = $state('');

  function startEdit(link: { id: number; platform: string; url: string }) {
    editingId = link.id;
    editPlatform = link.platform;
    editUrl = link.url;
  }

  function cancelEdit() {
    editingId = null;
  }

  const suggestions = [
    'SoundCloud', 'Spotify', 'Bandcamp', 'YouTube', 'Instagram',
    'X', 'Facebook', 'Apple Music', 'Tidal', 'Discogs', 'Resident Advisor',
  ];

  let unusedSuggestions = $derived(
    suggestions.filter(s => !data.socialLinks.some(l => l.platform.toLowerCase() === s.toLowerCase()))
  );
</script>

<svelte:head>
  <title>Social Links - wallybrain admin</title>
</svelte:head>

<h1 class="text-2xl font-bold text-text-primary mb-2">Social Links</h1>
<p class="text-text-muted text-sm mb-6">Manage links displayed on the About page. Drag to reorder.</p>

{#if form?.error}
  <div class="mb-4 px-3 py-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
    {form.error}
  </div>
{/if}

<!-- Existing Links -->
<div class="space-y-2 mb-8">
  {#each data.socialLinks as link (link.id)}
    <div class="flex items-center gap-3 p-3 rounded-lg bg-surface-raised">
      {#if editingId === link.id}
        <!-- Edit mode -->
        <form method="POST" action="?/update" use:enhance={() => { return async ({ update }) => { editingId = null; update(); }; }} class="flex-1 flex items-center gap-2">
          <input type="hidden" name="id" value={link.id} />
          <input
            type="text"
            name="platform"
            bind:value={editPlatform}
            class="bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-sm text-text-secondary w-32 focus:border-accent focus:outline-none"
            placeholder="Platform"
          />
          <input
            type="url"
            name="url"
            bind:value={editUrl}
            class="bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-sm text-text-secondary flex-1 focus:border-accent focus:outline-none"
            placeholder="https://..."
          />
          <button type="submit" class="text-xs text-accent-muted hover:text-accent-muted-hover font-mono uppercase tracking-wider px-2 py-1">Save</button>
          <button type="button" onclick={cancelEdit} class="text-xs text-text-muted hover:text-text-secondary font-mono uppercase tracking-wider px-2 py-1">Cancel</button>
        </form>
      {:else}
        <!-- Display mode -->
        <div class="flex-1 min-w-0">
          <span class="text-text-secondary font-medium text-sm">{link.platform}</span>
          <span class="text-text-muted text-xs ml-2 truncate">{link.url}</span>
        </div>
        <span class="text-text-muted/40 text-xs font-mono">#{link.displayOrder}</span>
        <button
          type="button"
          onclick={() => startEdit(link)}
          class="text-text-muted hover:text-accent-muted transition-colors text-sm"
          title="Edit"
        >&#x270E;</button>
        <form method="POST" action="?/delete" use:enhance class="inline">
          <input type="hidden" name="id" value={link.id} />
          <button
            type="submit"
            class="text-text-muted hover:text-red-400 transition-colors text-sm"
            title="Delete"
            onclick={(e) => { if (!confirm(`Remove ${link.platform}?`)) e.preventDefault(); }}
          >&times;</button>
        </form>
      {/if}
    </div>
  {/each}

  {#if data.socialLinks.length === 0}
    <p class="text-text-muted text-sm text-center py-6">No social links yet. Add one below.</p>
  {/if}
</div>

<!-- Add New Link -->
<div class="metal-panel rounded-lg p-4">
  <h2 class="text-xs font-mono uppercase tracking-widest text-text-muted mb-3">Add Link</h2>

  <!-- Quick-add suggestions -->
  {#if unusedSuggestions.length > 0}
    <div class="flex flex-wrap gap-1.5 mb-3">
      {#each unusedSuggestions as sug}
        <button
          type="button"
          onclick={() => { newPlatform = sug; }}
          class="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border transition-colors
            {newPlatform === sug
              ? 'border-accent text-accent-muted bg-accent/10'
              : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-default'}"
        >
          {sug}
        </button>
      {/each}
    </div>
  {/if}

  <form method="POST" action="?/add" use:enhance={() => { return async ({ update }) => { newPlatform = ''; newUrl = ''; update(); }; }} class="flex flex-col sm:flex-row gap-2">
    <input
      type="text"
      name="platform"
      bind:value={newPlatform}
      placeholder="Platform name"
      required
      class="bg-surface-overlay border border-border-subtle rounded px-3 py-2 text-sm text-text-secondary sm:w-40 focus:border-accent focus:outline-none"
    />
    <input
      type="url"
      name="url"
      bind:value={newUrl}
      placeholder="https://..."
      required
      class="bg-surface-overlay border border-border-subtle rounded px-3 py-2 text-sm text-text-secondary flex-1 focus:border-accent focus:outline-none"
    />
    <button
      type="submit"
      class="px-4 py-2 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
    >
      Add
    </button>
  </form>
</div>
