<script>
  let { children, data } = $props();
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { onNavigate } from '$app/navigation';
  import "../app.css";
  import PersistentPlayer from '$lib/components/PersistentPlayer.svelte';
  import WallybrainLogo from '$lib/components/WallybrainLogo.svelte';
  import { playerState } from '$lib/stores/playerState.svelte';

  let isHome = $derived(page.url.pathname === '/' || page.url.pathname === base + '/');
  let isAdmin = $derived(page.url.pathname.startsWith(base + '/admin'));
  let isUpload = $derived(page.url.pathname.startsWith(base + '/admin/upload'));

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
  <nav class="sticky top-0 z-[10000] border-b border-border-subtle/50 backdrop-blur-md bg-surface-base/80">
    <div class="max-w-4xl mx-auto w-full px-4 h-8 flex items-center justify-between">
      <div class="flex items-center gap-1">
        <a
          href="{base}/"
          class="px-2 py-0.5 rounded text-xs font-medium transition-colors
            {isHome
              ? 'bg-surface-hover text-text-primary'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50'}"
        >
          Home
        </a>
        <a
          href="{base}/admin"
          data-sveltekit-reload
          class="px-2 py-0.5 rounded text-xs font-medium transition-colors
            {isAdmin && !isUpload
              ? 'bg-surface-hover text-text-primary'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50'}"
        >
          Admin
        </a>
        <a
          href="{base}/admin/upload"
          data-sveltekit-reload
          class="px-2 py-0.5 rounded text-xs font-medium transition-colors
            {isUpload
              ? 'bg-surface-hover text-text-primary'
              : 'text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50'}"
        >
          Upload
        </a>
      </div>
      <div class="flex items-center gap-1">
        <a
          href="https://wallyblanchard.com"
          class="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest text-accent-muted hover:text-accent-muted-hover hover:bg-surface-overlay/50 transition-colors"
        >
          FNORD
        </a>
        {#if data.isAuthenticated}
          <a
            href="https://auth.wallybrain.icu/logout?rd=https://wallybrain.icu/"
            data-sveltekit-reload
            class="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50 transition-colors"
          >
            Sign Out
          </a>
        {:else}
          <a
            href="https://auth.wallybrain.icu/?rd=https://wallybrain.icu/admin"
            data-sveltekit-reload
            class="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50 transition-colors"
          >
            Sign In
          </a>
        {/if}
      </div>
    </div>
  </nav>

  {#if isHome}
    <div class="w-full flex items-end justify-center" style="min-height: 20vh;">
      <div class="pb-4">
        <WallybrainLogo size="lg" />
      </div>
    </div>
  {:else if !isAdmin}
    <header class="max-w-3xl mx-auto w-full px-4 pt-4 pb-2">
      <a href="{base}/" class="inline-block hover:opacity-70 transition-opacity">
        <WallybrainLogo size="sm" />
      </a>
    </header>
  {/if}

  <main class="flex-1 {playerState.currentTrack ? 'pb-24' : ''}">
    {@render children()}
  </main>
  {#if playerState.currentTrack}
    <PersistentPlayer />
  {/if}
</div>
