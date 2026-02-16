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
    <div class="max-w-4xl mx-auto w-full px-2 sm:px-4 h-8 flex items-center justify-between">
      <div class="flex items-center gap-0.5 sm:gap-1">
        <a
          href="https://wallyblanchard.com/fnord.html"
          class="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest transition-colors whitespace-nowrap
            text-accent-muted hover:text-accent-muted-hover hover:bg-surface-overlay/50"
        >
          FNORD
        </a>
        {#if data.isAuthenticated}
          <a
            href="{base}/admin"
            data-sveltekit-reload
            class="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest transition-colors whitespace-nowrap
              {isAdmin && !isUpload
                ? 'bg-surface-hover text-text-primary'
                : 'text-accent-muted hover:text-accent-muted-hover hover:bg-surface-overlay/50'}"
          >
            ADMIN
          </a>
          <a
            href="{base}/admin/upload"
            data-sveltekit-reload
            class="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest transition-colors whitespace-nowrap
              {isUpload
                ? 'bg-surface-hover text-text-primary'
                : 'text-accent-muted hover:text-accent-muted-hover hover:bg-surface-overlay/50'}"
          >
            UPLOAD
          </a>
        {/if}
      </div>
      <div class="flex items-center gap-0.5 sm:gap-1">
        {#if data.isAuthenticated}
          <a
            href="https://auth.wallybrain.icu/logout?rd=https://wallybrain.icu/"
            data-sveltekit-reload
            class="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50 transition-colors whitespace-nowrap"
          >
            Sign Out
          </a>
        {:else}
          <a
            href="https://auth.wallybrain.icu/?rd=https://wallybrain.icu/admin"
            data-sveltekit-reload
            class="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono tracking-wider sm:tracking-widest text-text-muted hover:text-text-secondary hover:bg-surface-overlay/50 transition-colors whitespace-nowrap"
          >
            Sign In
          </a>
        {/if}
      </div>
    </div>
  </nav>

  {#if isHome}
    <div class="max-w-3xl mx-auto w-full px-4 pt-2">
      <div class="logo-panel rounded-lg px-4 py-3 flex items-center justify-center">
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
