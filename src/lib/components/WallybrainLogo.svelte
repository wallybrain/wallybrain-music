<script lang="ts">
	let { size = 'sm' }: { size?: 'sm' | 'lg' } = $props();
</script>

<span
	class="leading-none select-none"
	class:text-lg={size === 'sm'}
	style="
		font-family: 'Silkscreen', monospace;
		letter-spacing: 0.08em;
		{size === 'lg' ? 'font-size: clamp(2.2rem, 9vw, 5rem);' : ''}
		-webkit-text-stroke: 1.5px oklch(0.75 0.008 260 / 0.55);
		color: oklch(0.68 0.006 260 / 0.15);
		filter: blur({size === 'lg' ? '1.2px' : '0.6px'});
	"
>wallybrain</span>
