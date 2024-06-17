import { Controller, Inject } from '@tsed/di';
import { Get, Returns } from '@tsed/schema';
import { PrometheusClient } from '../../../metrics/prometheus-client';

@Controller('/metrics')
export class MetricsController {
  @Inject()
  private prometheusClient: PrometheusClient;

  @Get('/')
  @(Returns(200, String).ContentType('text/plain; version=0.0.4; charset=utf-8'))
  async get() {
    return this.prometheusClient.getMetrics();
  }
}