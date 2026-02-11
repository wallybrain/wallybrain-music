import { spawn } from 'node:child_process';

export function generatePeaks(audioPath: string, outputPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn('audiowaveform', [
			'-i',
			audioPath,
			'-o',
			outputPath,
			'--pixels-per-second',
			'20',
			'--bits',
			'8'
		]);

		let stderr = '';

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				console.error(`audiowaveform failed (exit ${code}): ${stderr}`);
				reject(new Error('Waveform generation failed'));
			}
		});
	});
}
