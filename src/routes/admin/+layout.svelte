<script>
  let { children } = $props();
  import { base } from '$app/paths';
</script>

<div class="max-w-4xl mx-auto w-full px-4 py-6">
  <div class="flex justify-between items-center mb-6">
    <a href="{base}/admin" class="text-lg font-semibold text-zinc-300 hover:text-white transition-colors">
      admin
    </a>
    <a href="{base}/" class="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
      Back to site
    </a>
  </div>
  {@render children()}
</div>
