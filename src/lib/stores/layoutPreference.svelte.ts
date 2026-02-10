import { browser } from '$app/environment';

export type LayoutMode = 'list' | 'grid';

const STORAGE_KEY = 'wallybrain-layout';

class LayoutPreference {
	mode: LayoutMode = $state('list');

	constructor() {
		if (browser) {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored === 'grid' || stored === 'list') {
				this.mode = stored;
			}
		}
	}

	toggle() {
		this.mode = this.mode === 'list' ? 'grid' : 'list';
		if (browser) {
			localStorage.setItem(STORAGE_KEY, this.mode);
		}
	}

	setMode(mode: LayoutMode) {
		this.mode = mode;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, this.mode);
		}
	}
}

export const layoutPreference = new LayoutPreference();
