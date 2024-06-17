import { join } from 'path';
import { Configuration, Inject } from '@tsed/di';
import { PlatformApplication } from '@tsed/common';
import '@tsed/platform-express'; // /!\ keep this import
import '@tsed/ajv';
import '@tsed/swagger';
import * as rest from './http/controllers/api/index';
import * as pages from './http/controllers/pages/index';
import { config } from './config';

@Configuration({
  ...config,
  debug: true,
  acceptMimes: ['application/json'],
  httpPort: process.env.PORT || 8083,
  httpsPort: false,
  disableComponentsScan: true,
  ajv: {
    returnsCoercedValues: true,
  },
  logger: {
    logRequest: false,
  },
  mount: {
    '/rest': [
      ...Object.values(rest),
    ],
    '/': [
      ...Object.values(pages),
    ],
  },
  swagger: [
    {
      path: '/doc',
      specVersion: '3.0.1',
    },
  ],
  middlewares: [
    'cors',
    'compression',
    'method-override',
    'json-parser',
    {use: 'urlencoded-parser', options: {extended: true}},
  ],
  views: {
    root: join(process.cwd(), '../views'),
    extensions: {
      ejs: 'ejs',
    },
  },
  exclude: [
    '**/*.spec.ts',
  ],
  jsonMapper: {
    additionalProperties: true,
    disableUnsecureConstructor: false,
    strictGroups: false,
  },
})
export class Server {
  @Inject()
  protected app: PlatformApplication;

  @Configuration()
  protected settings: Configuration;
}
