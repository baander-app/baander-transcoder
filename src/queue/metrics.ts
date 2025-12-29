import { QueueMetrics } from './types';

export class Metrics {
  private _completed = 0;
  private _failed = 0;
  private history: number[] = []; // timestamps of completions
  private readonly WINDOW_MS = 60000;

  recordCompletion() {
    this._completed++;
    this.history.push(Date.now());
    this.cleanHistory();
  }

  recordFailure() {
    this._failed++;
  }

  private cleanHistory() {
    const now = Date.now();
    this.history = this.history.filter(t => now - t <= this.WINDOW_MS);
  }

  get throughput(): number {
    this.cleanHistory();
    return this.history.length;
  }

  get completed(): number {
    return this._completed;
  }

  get failed(): number {
    return this._failed;
  }

  reset() {
    this._completed = 0;
    this._failed = 0;
    this.history = [];
  }
}
