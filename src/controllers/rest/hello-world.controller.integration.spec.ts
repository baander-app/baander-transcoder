import { expect, describe, it, afterAll, beforeAll } from 'vitest';
import { PlatformTest } from '@tsed/common';
import SuperTest from 'supertest';
import { HelloWorldController } from './hello-world.controller';
import { Server } from '../../Server';

describe('HelloWorldController', () => {
  beforeAll(PlatformTest.bootstrap(Server, {
    mount: {
      '/': [HelloWorldController],
    },
  }));
  afterAll(PlatformTest.reset);

  it('should call GET /hello-world', async () => {
    const request = SuperTest(PlatformTest.callback());
    const response = await request.get('/hello-world').expect(200);

    expect(response.text).toEqual('hello');
  });
});
