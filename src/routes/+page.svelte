<script>
  let { data } = $props();
</script>

<div class="min-h-screen bg-gray-950 flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-white tracking-tight">wallybrain</h1>
    <p class="mt-2 text-gray-500">music platform</p>
    <p class="mt-4 text-gray-600 text-sm">{data.trackCount} tracks</p>
  </div>
</div>
