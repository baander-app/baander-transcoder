import { $log } from '@tsed/common';
import { isProduction } from '../envs/index';
import { DILoggerOptions } from '@tsed/di';

if (isProduction) {
  $log.appenders.set('stdout', {
    type: 'stdout',
    levels: ['info', 'debug'],
    layout: {
      type: 'json',
    },
  });

  $log.appenders.set('stderr', {
    levels: ['trace', 'fatal', 'error', 'warn'],
    type: 'stderr',
    layout: {
      type: 'json',
    },
  });
}

export default <DILoggerOptions>{
  disableRoutesSummary: isProduction,
};
