import { Service } from '@tsed/di';
import * as client from 'prom-client';
import { Registry } from 'prom-client';

@Service()
export class PrometheusClient {
  private readonly registry: Registry;
  private readonly transcodeCounter: client.Counter;

  constructor() {
    this.registry = new client.Registry();
    this.registry.setDefaultLabels({
      app: 'baander-transcoder',
    });
    client.collectDefaultMetrics({ register: this.registry });

    this.transcodeCounter = new client.Counter({
      name: 'transcode_counter',
      help: 'Number of transcodes',
    });
    this.registry.registerMetric(this.transcodeCounter);
  }

  getMetrics() {
    return this.registry.metrics();
  }

  incrementTranscodeCounter() {
    this.transcodeCounter.inc();
  }

  decrementTranscodeCounter() {
    this.transcodeCounter.inc(-1);
  }
}