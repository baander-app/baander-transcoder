import { $log } from '@tsed/common';
import { FFMPEG_PATH } from '../config/envs';
import { ChildProcess, spawn } from 'node:child_process';

export class Transcode {
  private process: ChildProcess;
  private promise: Promise<any>;
  private resolve: (value: any) => void;
  private reject: (reason: any) => void;

  constructor(public segment:number, private args: string[]) {


  }

  start() {
    this.createPromise();

    this.process = spawn(FFMPEG_PATH, ['-hide_banner', ...this.args], {
      shell: false,
      windowsVerbatimArguments: true,
    });

    this.process.stderr?.setEncoding('utf-8');
    this.process.stdout?.setEncoding('utf-8');

    this.process.on('error', (err) => {
      this.onError(err);
    });

    this.process.on('exit', (message) => {
      console.info(message);

      this.onSuccess(message);
    });

    return this.promise;
  }

  get isRunning() {
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

  private createPromise() {
    this.promise = new Promise((resolve, reject) => {
      // Save the resolve and reject functions to be used later
      this.resolve = resolve;
      this.reject = reject;

      // Set a timeout to reject the promise
      setTimeout(() => {
        reject(new Error('Promise timed out'));
      }, 5000); // 5 seconds timeout
    });
  }

  private onSuccess(value: any) {
    // Resolve the promise
    this.resolve(value);
  }

  private onError(reason: any) {
    // Reject the promise
    this.reject(reason);
  }
}