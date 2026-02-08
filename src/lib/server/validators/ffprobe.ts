import { spawn } from 'node:child_process';

export function validateWithFFprobe(
	filepath: string
): Promise<{ valid: boolean; duration?: number; bitrate?: number; error?: string }> {
	return new Promise((resolve) => {
		const proc = spawn('ffprobe', [
			'-v',
			'error',
			'-show_entries',
			'format=duration,bit_rate',
			'-of',
			'json',
			filepath
		]);

		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data: Buffer) => {
			stdout += data.toString();
		});

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code !== 0) {
				resolve({ valid: false, error: 'Corrupt or invalid audio file' });
				return;
			}

			try {
				const parsed = JSON.parse(stdout);
				const duration = parseFloat(parsed.format?.duration);
				const bitrate = parseInt(parsed.format?.bit_rate, 10);

				resolve({
					valid: true,
					duration: isNaN(duration) ? undefined : duration,
					bitrate: isNaN(bitrate) ? undefined : bitrate
				});
			} catch {
				resolve({ valid: false, error: 'Failed to parse ffprobe output' });
			}
		});
	});
}
