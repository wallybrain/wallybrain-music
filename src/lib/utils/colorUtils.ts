function hexToRgb(hex: string): [number, number, number] {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return [r, g, b];
}

function linearize(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbHexToOklch(hex: string): { l: number; c: number; h: number } {
	const [r, g, b] = hexToRgb(hex).map(linearize);
	const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
	const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
	const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
	const l1 = Math.cbrt(l_);
	const m1 = Math.cbrt(m_);
	const s1 = Math.cbrt(s_);
	const L = 0.2104542553 * l1 + 0.7936177850 * m1 - 0.0040720468 * s1;
	const a = 1.9779984951 * l1 - 2.4285922050 * m1 + 0.4505937099 * s1;
	const bVal = 0.0259040371 * l1 + 0.7827717662 * m1 - 0.8086757660 * s1;
	const C = Math.sqrt(a * a + bVal * bVal);
	let H = Math.atan2(bVal, a) * (180 / Math.PI);
	if (H < 0) H += 360;
	return { l: L, c: C, h: isNaN(H) ? 0 : H };
}

