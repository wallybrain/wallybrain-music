export type QueueTrack = {
	id: string;
	slug: string;
	title: string;
	duration: number;
	artPath: string | null;
};

class PlayerState {
	currentTrack: QueueTrack | null = $state(null);
	queue: QueueTrack[] = $state([]);
	queueIndex: number = $state(-1);
	isPlaying: boolean = $state(false);
	currentTime: number = $state(0);
	volume: number = $state(1);
	private _pauseCallback: (() => void) | null = null;

	/** PersistentPlayer registers its pause function here */
	registerPause(fn: () => void) {
		this._pauseCallback = fn;
	}

	/** Called by WaveformPlayer to directly pause the persistent player */
	pausePersistent() {
		this.isPlaying = false;
		this._pauseCallback?.();
	}

	get hasNext(): boolean {
		return this.queueIndex < this.queue.length - 1;
	}

	get hasPrev(): boolean {
		return this.queueIndex > 0;
	}

	play(track: QueueTrack, queue: QueueTrack[] = [track], index: number = 0) {
		this.currentTrack = track;
		this.queue = queue;
		this.queueIndex = index;
		this.isPlaying = true;
		this.currentTime = 0;
	}

	togglePlayPause() {
		this.isPlaying = !this.isPlaying;
	}

	next(): boolean {
		if (this.hasNext) {
			this.queueIndex++;
			this.currentTrack = this.queue[this.queueIndex];
			this.currentTime = 0;
			this.isPlaying = true;
			return true;
		}
		this.isPlaying = false;
		return false;
	}

	prev() {
		if (this.hasPrev) {
			this.queueIndex--;
			this.currentTrack = this.queue[this.queueIndex];
			this.currentTime = 0;
			this.isPlaying = true;
		}
	}

	setVolume(v: number) {
		this.volume = Math.max(0, Math.min(1, v));
	}

	stop() {
		this.currentTrack = null;
		this.queue = [];
		this.queueIndex = -1;
		this.isPlaying = false;
		this.currentTime = 0;
	}
}

export const playerState = new PlayerState();
