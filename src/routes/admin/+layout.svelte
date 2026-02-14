<script>
  import { base } from '$app/paths';
  import { page } from '$app/state';

  let { children } = $props();

  const adminLinks = [
    { href: `${base}/admin`, label: 'Tracks' },
    { href: `${base}/admin/collections`, label: 'Collections' },
    { href: `${base}/admin/social-links`, label: 'Social Links' },
  ];
</script>

<div class="max-w-4xl mx-auto w-full px-4 py-6">
  <div class="flex items-center gap-1 mb-4 border-b border-border-subtle/50 pb-2">
    {#each adminLinks as link}
      <a
        href={link.href}
        class="px-2 py-1 rounded text-[10px] font-mono tracking-widest uppercase transition-colors
          {page.url.pathname === link.href
            ? 'bg-surface-hover text-text-primary'
            : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50'}"
      >
        {link.label}
      </a>
    {/each}
  </div>
  {@render children()}
</div>
