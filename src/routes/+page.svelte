<script>
  import WaveformPlayer from '$lib/components/WaveformPlayer.svelte';

  let { data } = $props();
</script>

<div class="min-h-screen bg-zinc-950">
  <div class="max-w-3xl mx-auto p-6">
    <h1 class="text-3xl font-bold text-white mb-8">wallybrain</h1>

    {#if data.tracks.length === 0}
      <p class="text-zinc-500">No tracks yet.</p>
    {:else}
      <div class="space-y-8">
        {#each data.tracks as track (track.id)}
          <div class="bg-zinc-900 rounded-lg p-4">
            <h2 class="text-lg font-semibold text-zinc-200 mb-3">{track.title}</h2>
            <WaveformPlayer trackId={track.id} duration={track.duration ?? 0} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
