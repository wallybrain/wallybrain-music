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

			const styles = getComputedStyle(document.documentElement);
			const waveColor = styles.getPropertyValue('--color-waveform-idle').trim();
			const progressStart = styles.getPropertyValue('--color-waveform-progress-start').trim();
			const progressEnd = styles.getPropertyValue('--color-waveform-progress-end').trim();
			const cursorColor = styles.getPropertyValue('--color-waveform-cursor').trim();

			ws = WaveSurfer.create({
				container,
				waveColor: waveColor || '#4a4a5a',
				progressColor: progressStart ? [progressStart, progressEnd || progressStart] : '#8b5cf6',
				cursorColor: cursorColor || '#8b5cf6',
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
		<div class="h-20 rounded overflow-hidden flex items-end justify-around gap-px px-1">
			{#each { length: 48 } as _, i}
				<div
					class="w-0.5 bg-surface-overlay rounded-full animate-pulse"
					style="height: {20 + Math.sin(i * 0.5) * 30 + Math.sin(i * 0.3) * 20}%"
				></div>
			{/each}
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
			class="px-4 py-1.5 rounded bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-text-primary text-sm font-medium transition-colors"
		>
			{isPlaying ? 'Pause' : 'Play'}
		</button>

		<span class="text-sm text-text-tertiary font-mono tabular-nums">
			{formatTime(currentTime)} / {formatTime(duration)}
		</span>

		<div class="flex-1"></div>

		<div class="flex items-center gap-2">
			<span class="text-xs text-text-muted">Vol</span>
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
				class="w-20 accent-accent"
			/>
		</div>
	</div>
</div>
