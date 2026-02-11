<script lang="ts">
	let { size = 'sm' }: { size?: 'sm' | 'lg' } = $props();
</script>

<span
	class="font-heading font-extralight leading-none select-none"
	class:text-lg={size === 'sm'}
	style="
		{size === 'lg' ? 'font-size: clamp(3.5rem, 12vw, 7rem);' : ''}
		-webkit-text-stroke: 1px oklch(0.60 0.012 286 / 0.35);
		color: transparent;
		filter: blur({size === 'lg' ? '1.5px' : '0.8px'});
	"
>wallybrain</span>
