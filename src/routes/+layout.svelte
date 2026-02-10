<script>
  let { children } = $props();
  import { base } from '$app/paths';
  import { onNavigate } from '$app/navigation';
  import "../app.css";
  import PersistentPlayer from '$lib/components/PersistentPlayer.svelte';
  import { playerState } from '$lib/stores/playerState.svelte';

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });
</script>

<div class="min-h-screen flex flex-col">
  <header class="max-w-3xl mx-auto w-full px-4 pt-6 pb-2">
    <a href="{base}/" class="text-lg font-heading font-semibold text-text-secondary hover:text-text-primary transition-colors">
      wallybrain
    </a>
  </header>
  <main class="flex-1 {playerState.currentTrack ? 'pb-24' : ''}">
    {@render children()}
  </main>
  {#if playerState.currentTrack}
    <PersistentPlayer />
  {/if}
</div>
