<script lang="ts">
	import { onMount } from 'svelte';
	import { formatTime } from '$lib/utils/formatTime';
	import type WaveSurfer from 'wavesurfer.js';

	let { trackId, duration }: { trackId: string; duration: number } = $props();

	let container: HTMLDivElement = $state(null!);
	let wavesurfer: WaveSurfer | null = $state(null);
	let isPlaying: boolean = $state(false);
	let isLoading: boolean = $state(true);
	let currentTime: number = $state(0);
	let volume: number = $state(1);
	let loadError: boolean = $state(false);
	let hasCountedPlay: boolean = $state(false);

	function onPlay() {
		if (!hasCountedPlay) {
			hasCountedPlay = true;
			fetch(`/music/api/tracks/${trackId}/play`, { method: 'POST' });
		}
	}

	onMount(() => {
		let ws: WaveSurfer;

		const init = async () => {
			const { default: WaveSurfer } = await import('wavesurfer.js');

			let peaksData: number[];
			try {
				const res = await fetch(`/music/api/tracks/${trackId}/peaks`);
				if (!res.ok) throw new Error(`Peaks fetch failed: ${res.status}`);
				peaksData = await res.json();
			} catch (err) {
				console.error('Failed to load peaks:', err);
				isLoading = false;
				loadError = true;
				return;
			}

			ws = WaveSurfer.create({
				container,
				waveColor: '#4a4a5a',
				progressColor: '#8b5cf6',
				cursorColor: '#8b5cf6',
				cursorWidth: 2,
				height: 80,
				barWidth: 2,
				barGap: 1,
				barRadius: 2,
				normalize: false,
				interact: true,
				dragToSeek: true,
				url: `/music/api/tracks/${trackId}/audio`,
				peaks: [peaksData],
				duration: duration,
			});

				ws.on('play', () => {
				isPlaying = true;
				onPlay();
			});
			ws.on('pause', () => (isPlaying = false));
			ws.on('finish', () => (isPlaying = false));
			ws.on('timeupdate', (time: number) => (currentTime = time));
			ws.on('ready', () => (isLoading = false));
			ws.on('error', (err: Error) => {
				console.error('WaveSurfer error:', err);
				isLoading = false;
			});

			wavesurfer = ws;
		};

		init();

		return () => {
			ws?.destroy();
		};
	});
</script>

<div class="waveform-player">
	{#if isLoading && !loadError}
		<div class="flex items-center justify-center h-20 text-zinc-500">
			<span>Loading waveform...</span>
		</div>
	{/if}

	{#if loadError}
		<div class="flex items-center justify-center h-20 text-red-400">
			<span>Failed to load waveform</span>
		</div>
	{/if}

	<div bind:this={container} class:hidden={isLoading || loadError}></div>

	<div class="flex items-center gap-4 mt-2">
		<button
			onclick={() => wavesurfer?.playPause()}
			disabled={isLoading || loadError}
			class="px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
		>
			{isPlaying ? 'Pause' : 'Play'}
		</button>

		<span class="text-sm text-zinc-400 font-mono tabular-nums">
			{formatTime(currentTime)} / {formatTime(duration)}
		</span>

		<div class="flex-1"></div>

		<div class="flex items-center gap-2">
			<span class="text-xs text-zinc-500">Vol</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={volume}
				oninput={(e: Event) => {
					volume = parseFloat((e.currentTarget as HTMLInputElement).value);
					wavesurfer?.setVolume(volume);
				}}
				class="w-20 accent-violet-500"
			/>
		</div>
	</div>
</div>
