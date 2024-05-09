import { $log } from '@tsed/common';
import { FFMPEG_PATH } from '../config/envs';
import { ChildProcess, spawn } from 'node:child_process';

export class Transcode {
  segment: number;
  private process: ChildProcess;
  private _error: null | Error = null;

  get error() {
    return this._error;
  }

  constructor(private args: string[]) {
    this.process = spawn(FFMPEG_PATH, ['-hide_banner', ...this.args], {
      shell: false,
      windowsVerbatimArguments: true,
    });


    this.process.on('error', (err) => {
      this._error = err;
    });

    this.process.on('exit', (message) => {
      console.info(message);
    });

    this.process.stderr?.setEncoding('utf-8');
    this.process.stdout?.setEncoding('utf-8');

    this.process.stderr?.on('data', (data) => {
      console.log(data);
    });

    this.process.stderr?.on('close', () => {
      //handle exit
    });

    this.process.stdout?.on('data', (data) => {
      console.log(data);
    });

  }

  isRunning() {
    return this.process.connected;
  }

  stop() {
    this.process.kill('SIGKILL');
  }

  checkSegments() {

  }

  private onProgress() {

  }

  private exitHandler() {
  }
}