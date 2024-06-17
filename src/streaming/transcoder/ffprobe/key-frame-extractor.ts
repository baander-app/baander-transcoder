import { spawn } from 'node:child_process';
import * as process from 'node:process';
import { $log } from '@tsed/common';

export class KeyFrameExtractor {
  private processed = 0;
  private keyFrames: number[] = [];

  constructor(public sourcePath: string) {
  }

  async extract() {
    const startTime = process.hrtime();

    const keyFrames = this.extractKeyFrames();

    $log.info(`[KeyFrameExtractor] Extracted ${this.processed} keyframes in ${process.hrtime(startTime)[0]} seconds`, {
      sourcePath: this.sourcePath,
      processed: this.processed,
    });

    return keyFrames;
  }

  private async extractKeyFrames() {
    const process = await this.runProbe();

    process.stdout.on('data', (data) => {
      data.toString().split('\n').forEach((line: string) => {
        const frame = this.extractLine(line);
        if (frame !== null) {
          this.keyFrames.push(frame);
        }
      });
    });

    return await new Promise<number[]>((resolve) => {
      process.on('exit', () => {
        resolve(this.keyFrames);
      });
    });
  }

  private extractLine(frame: string) {
    if (frame === '') {
      return null;
    }

    const x = frame.split(',');
    const pts = x[0];
    const flags = x[1];

    // Only take keyframes
    if (flags.charAt(0) !== 'K') {
      return null;
    }

    let floatPts = parseFloat(pts);
    if (isNaN(floatPts)) {
      throw new Error('Invalid pts');
    }

    this.processed++;

    return floatPts;
  }

  private async runProbe() {
    return spawn('ffprobe', this.command());
  }

  private command() {
    return [
      '-loglevel', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'packet=pts_time,flags',
      '-of','csv=print_section=0',
      this.sourcePath
    ]
  }
}