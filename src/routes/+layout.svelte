<script>
  let { children } = $props();
  import { base } from '$app/paths';
  import "../app.css";
  import PersistentPlayer from '$lib/components/PersistentPlayer.svelte';
  import { playerState } from '$lib/stores/playerState.svelte';
</script>

<div class="min-h-screen flex flex-col">
  <header class="max-w-3xl mx-auto w-full px-4 pt-6 pb-2">
    <a href="{base}/" class="text-lg font-semibold text-zinc-300 hover:text-white transition-colors">
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
