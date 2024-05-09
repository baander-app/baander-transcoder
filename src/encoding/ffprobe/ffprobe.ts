import { spawn, spawnSync } from 'node:child_process';
import { FFProbeReport, Format } from './models/format';
import { deserialize } from '@tsed/json-mapper';
import { JsonEntityStore } from '@tsed/schema';

export class Ffprobe {
  async probeFile(path: string) {
    const result = spawnSync('ffprobe', [
      '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '-show_error', path,
    ], { encoding: 'utf-8' });

    return JSON.parse(result.stdout) as unknown as FFProbeReport;

    // return deserialize<FFProbeReport>(result.stdout, {
    //   store: JsonEntityStore.from(FFProbeReport),
    // });
  }
}
