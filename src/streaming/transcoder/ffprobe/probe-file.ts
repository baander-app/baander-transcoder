import { Probe } from './models';
import { spawnSync } from 'node:child_process';

export async function probeFile(path: string): Promise<Probe> {
  const result = spawnSync('ffprobe', [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    '-show_error',
    '-find_stream_info',
    '-probesize',
    '10000000', // 10MB
    '-analyzeduration',
    '2000000', // 2s
    path,
  ], { encoding: 'utf-8' });

  if (result.error) {
    throw result.error;
  }

  return JSON.parse(result.stdout) as unknown as Probe;
}