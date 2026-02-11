<script lang="ts">
  import { base } from '$app/paths';

  let { trackId, artPath, title, size = 'md', dominantColor = null, entityType = 'tracks' }: {
    trackId: string;
    artPath: string | null;
    title: string;
    size?: 'sm' | 'md' | 'lg';
    dominantColor?: string | null;
    entityType?: 'tracks' | 'collections';
  } = $props();

  let glowStyle = $derived(
    dominantColor && size === 'lg'
      ? `box-shadow: 0 0 40px ${dominantColor}66, 0 0 80px ${dominantColor}33, 0 4px 16px rgba(0,0,0,0.4);`
      : ''
  );

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

  let enableZoom = $derived(size === 'sm');
</script>

{#if artPath}
  <div
    class="{sizeClasses[size]} rounded-lg overflow-hidden shrink-0 bevel-image {size === 'lg' ? '' : ''}"
    style={glowStyle}
  >
    <img
      src="{base}/api/{entityType}/{trackId}/art"
      alt="Cover art for {title}"
      class="w-full h-full object-cover {enableZoom ? 'transition-transform duration-300 group-hover:scale-110' : ''}"
      loading="lazy"
    />
  </div>
{:else}
  <div class="{sizeClasses[size]} rounded-lg bg-surface-overlay bevel-image shrink-0 flex items-center justify-center">
    <span class="text-text-muted {placeholderTextSize[size]}">&#9835;</span>
  </div>
{/if}
