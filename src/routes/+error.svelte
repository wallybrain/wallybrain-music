<script>
  import { page } from '$app/state';
  import { base } from '$app/paths';
</script>

<div class="min-h-[60vh] flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-zinc-300 mb-2">{page.status}</h1>
    <p class="text-zinc-500 mb-6">{page.error?.message || 'Something went wrong'}</p>
    <a href="{base}/" class="text-violet-400 hover:text-violet-300">Back to tracks</a>
  </div>
</div>
