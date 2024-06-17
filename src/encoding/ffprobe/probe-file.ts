import { spawnSync } from 'node:child_process';
import { FFProbeReport } from './models/format';

export async function probeFile(path: string) {
  const result = spawnSync('ffprobe', [
    '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '-show_error', path,
  ], { encoding: 'utf-8' });

  return JSON.parse(result.stdout) as unknown as FFProbeReport;

  // return deserialize<FFProbeReport>(result.stdout, {
  //   store: JsonEntityStore.from(FFProbeReport),
  // });
}