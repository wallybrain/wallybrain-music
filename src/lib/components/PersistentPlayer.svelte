<script lang="ts">
	import { onMount } from 'svelte';
	import { playerState } from '$lib/stores/playerState.svelte';
	import { formatTime } from '$lib/utils/formatTime';
	import { base } from '$app/paths';
	import type WaveSurfer from 'wavesurfer.js';

	let container: HTMLDivElement = $state(null!);
	let wavesurfer: WaveSurfer | null = $state(null);
	let loadedTrackId: string = $state('');

	onMount(() => {
		let ws: WaveSurfer;

		const init = async () => {
			const { default: WaveSurfer } = await import('wavesurfer.js');

			const styles = getComputedStyle(document.documentElement);
			const waveColor = styles.getPropertyValue('--color-waveform-idle').trim();
			const progressStart = styles.getPropertyValue('--color-waveform-progress-start').trim();
			const progressEnd = styles.getPropertyValue('--color-waveform-progress-end').trim();

			ws = WaveSurfer.create({
				container,
				height: 40,
				waveColor: waveColor || '#4a4a5a',
				progressColor: progressStart ? [progressStart, progressEnd || progressStart] : '#8b5cf6',
				cursorColor: 'transparent',
				barWidth: 2,
				barGap: 1,
				barRadius: 1,
				normalize: false,
				interact: true,
				dragToSeek: true,
			});

			ws.on('finish', () => {
				playerState.next();
			});
			ws.on('timeupdate', (time: number) => {
				playerState.currentTime = time;
			});
			ws.on('play', () => {
				playerState.isPlaying = true;
			});
			ws.on('pause', () => {
				playerState.isPlaying = false;
			});

			wavesurfer = ws;

			playerState.registerPause(() => {
				ws.pause();
			});
		};

		init();

		return () => {
			ws?.destroy();
		};
	});

	$effect(() => {
		const track = playerState.currentTrack;
		if (!track || !wavesurfer) return;
		if (track.id === loadedTrackId) return;

		const trackId = track.id;
		loadedTrackId = trackId;

		fetch(`${base}/api/tracks/${trackId}/peaks`)
			.then((r) => r.json())
			.then((peaks) => {
				if (playerState.currentTrack?.id !== trackId) return;
				wavesurfer!.load(`${base}/api/tracks/${trackId}/audio`, [peaks], track.duration);
				wavesurfer!.once('ready', () => {
					if (playerState.isPlaying) {
						wavesurfer!.play();
					}
				});
			});

		fetch(`${base}/api/tracks/${trackId}/play`, { method: 'POST' });
	});

	$effect(() => {
		if (!wavesurfer) return;
		const shouldPlay = playerState.isPlaying;
		if (shouldPlay && !wavesurfer.isPlaying()) {
			wavesurfer.play();
		} else if (!shouldPlay && wavesurfer.isPlaying()) {
			wavesurfer.pause();
		}
	});

	$effect(() => {
		wavesurfer?.setVolume(playerState.volume);
	});
</script>

<div class="fixed bottom-0 left-0 right-0 bg-surface-raised/90 backdrop-blur-lg border-t border-accent/15 shadow-[0_-4px_16px_rgba(0,0,0,0.4)] z-50" style="view-transition-name: player-bar;">
	<div class="max-w-3xl mx-auto px-4 py-2 flex items-center gap-3">
		{#if playerState.currentTrack}
			<a href="{base}/track/{playerState.currentTrack.slug}" class="shrink-0">
				{#if playerState.currentTrack.artPath}
					<img
						src="{base}/api/tracks/{playerState.currentTrack.id}/art"
						alt="Cover art for {playerState.currentTrack.title}"
						class="w-10 h-10 rounded object-cover"
					/>
				{:else}
					<div class="w-10 h-10 rounded bg-surface-overlay flex items-center justify-center">
						<span class="text-text-muted text-sm">&#9835;</span>
					</div>
				{/if}
			</a>

			<div class="min-w-0 shrink-0 w-28">
				<p class="text-sm text-text-secondary truncate">{playerState.currentTrack.title}</p>
				<p class="text-xs text-text-muted font-mono tabular-nums">
					{formatTime(playerState.currentTime)} / {formatTime(playerState.currentTrack.duration)}
				</p>
			</div>
		{/if}

		<div class="flex items-center gap-1 shrink-0">
			<button
				onclick={() => playerState.prev()}
				disabled={!playerState.hasPrev}
				class="px-2 py-1 rounded text-xs text-text-tertiary hover:text-text-primary bg-surface-hover hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
			>
				&laquo;
			</button>
			<button
				onclick={() => playerState.togglePlayPause()}
				class="px-3 py-1 rounded text-xs text-text-primary bg-accent hover:bg-accent-hover transition-colors"
			>
				{playerState.isPlaying ? 'Pause' : 'Play'}
			</button>
			<button
				onclick={() => playerState.next()}
				disabled={!playerState.hasNext}
				class="px-2 py-1 rounded text-xs text-text-tertiary hover:text-text-primary bg-surface-hover hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
			>
				&raquo;
			</button>
		</div>

		<div bind:this={container} class="flex-1 min-w-0 hidden md:block"></div>

		<div class="hidden md:flex items-center gap-1 shrink-0">
			<span class="text-xs text-text-muted">Vol</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={playerState.volume}
				oninput={(e: Event) => {
					playerState.setVolume(parseFloat((e.currentTarget as HTMLInputElement).value));
				}}
				class="w-16 accent-accent"
			/>
		</div>
	</div>
</div>
