import { spawn } from 'node:child_process';

export function transcodeAudio(inputPath: string, outputPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const proc = spawn('ffmpeg', [
			'-i',
			inputPath,
			'-codec:a',
			'libmp3lame',
			'-b:a',
			'320k',
			'-write_id3v2',
			'1',
			'-id3v2_version',
			'3',
			'-map_metadata',
			'0',
			'-y',
			outputPath
		]);

		let stderr = '';

		proc.stderr.on('data', (data: Buffer) => {
			stderr += data.toString();
		});

		proc.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				console.error(`ffmpeg transcode failed (exit ${code}): ${stderr}`);
				reject(new Error('Audio transcoding failed'));
			}
		});
	});
}
