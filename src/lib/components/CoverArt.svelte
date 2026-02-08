<script lang="ts">
  import { base } from '$app/paths';

  let { trackId, artPath, title, size = 'md' }: {
    trackId: string;
    artPath: string | null;
    title: string;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const sizeClasses: Record<string, string> = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 md:w-32 md:h-32',
    lg: 'w-full max-w-md aspect-square',
  };

  const placeholderTextSize: Record<string, string> = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };
</script>

{#if artPath}
  <img
    src="{base}/api/tracks/{trackId}/art"
    alt="Cover art for {title}"
    class="{sizeClasses[size]} rounded-lg object-cover"
    loading="lazy"
  />
{:else}
  <div class="{sizeClasses[size]} rounded-lg bg-zinc-800 flex items-center justify-center">
    <span class="text-zinc-600 {placeholderTextSize[size]}">&#9835;</span>
  </div>
{/if}
