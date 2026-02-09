<script lang="ts">
  import { base } from '$app/paths';

  type UploadEntry = {
    file: File;
    trackId: string | null;
    status: 'uploading' | 'pending' | 'processing' | 'ready' | 'failed';
    error: string | null;
  };

  let isDragging = $state(false);
  let uploads: UploadEntry[] = $state([]);
  let fileInput: HTMLInputElement;

  const statusColors: Record<string, string> = {
    uploading: 'bg-violet-500/20 text-violet-400',
    pending: 'bg-zinc-700/50 text-zinc-400',
    processing: 'bg-amber-500/20 text-amber-400',
    ready: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
  };

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      handleFiles(input.files);
      input.value = '';
    }
  }

  async function handleFiles(fileList: FileList) {
    const files = Array.from(fileList);

    for (const file of files) {
      const entry: UploadEntry = { file, trackId: null, status: 'uploading', error: null };
      uploads = [...uploads, entry];
      const index = uploads.length - 1;

      try {
        const formData = new FormData();
        formData.append('audio', file);

        const response = await fetch(`${base}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          uploads[index] = { ...uploads[index], status: 'failed', error: data.error || 'Upload failed' };
        } else {
          uploads[index] = { ...uploads[index], trackId: data.trackId, status: 'pending' };
        }
      } catch {
        uploads[index] = { ...uploads[index], status: 'failed', error: 'Network error' };
      }
    }
  }

  $effect(() => {
    const active = uploads.filter(
      (u) => u.trackId && (u.status === 'pending' || u.status === 'processing')
    );

    if (active.length === 0) return;

    const interval = setInterval(async () => {
      for (const upload of active) {
        if (!upload.trackId) continue;
        try {
          const res = await fetch(`${base}/api/tracks/${upload.trackId}/status`);
          if (!res.ok) continue;
          const data = await res.json();
          const idx = uploads.findIndex((u) => u.trackId === upload.trackId);
          if (idx !== -1) {
            uploads[idx] = {
              ...uploads[idx],
              status: data.status,
              error: data.errorMessage || null,
            };
          }
        } catch {
          // ignore polling errors
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>Upload - wallybrain admin</title>
</svelte:head>

<h1 class="text-2xl font-bold text-white mb-1">Upload Tracks</h1>
<p class="text-zinc-500 text-sm mb-6">Supports MP3, WAV, FLAC, OGG, and AIFF files</p>

<div
  role="button"
  tabindex="0"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  class="border-2 border-dashed rounded-lg p-12 text-center transition-colors {isDragging
    ? 'border-violet-500 bg-violet-500/10'
    : 'border-zinc-700 hover:border-zinc-500'}"
>
  <p class="text-zinc-400 mb-3">Drag audio files here or</p>
  <button
    onclick={() => fileInput.click()}
    class="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
  >
    Browse files
  </button>
  <input
    bind:this={fileInput}
    type="file"
    accept="audio/*"
    multiple
    onchange={handleFileSelect}
    class="hidden"
  />
</div>

{#if uploads.length > 0}
  <div class="mt-8 space-y-3">
    {#each uploads as upload, i (i)}
      <div class="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/50">
        <div class="flex-1 min-w-0">
          <p class="text-zinc-200 text-sm font-medium truncate">{upload.file.name}</p>
          {#if upload.status === 'failed' && upload.error}
            <p class="text-xs text-red-400/70 mt-0.5">{upload.error}</p>
          {/if}
          {#if upload.status === 'ready' && upload.trackId}
            <a
              href="{base}/admin/tracks/{upload.trackId}"
              class="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-0.5 inline-block"
            >
              Edit metadata
            </a>
          {/if}
        </div>
        <span
          class="px-2 py-0.5 rounded text-xs font-medium {statusColors[upload.status]} {upload.status === 'uploading' ? 'animate-pulse' : ''}"
        >
          {upload.status}
        </span>
      </div>
    {/each}
  </div>
{/if}
