import { Middleware, MiddlewareMethods, UseAfter } from '@tsed/platform-middlewares';
import { Context } from '@tsed/platform-params';
import { useDecorators } from '@tsed/core';
import { ReadStream } from 'fs';
import { BadRequest } from '@tsed/exceptions';
import { contentType } from 'mime-types';

@Middleware()
export class GuessMimeMiddleware implements MiddlewareMethods {
  async use(@Context() ctx: Context) {
    const data = ctx.data;

    if (data instanceof ReadStream) {
      // fallback
      const path = data.path.toString();
      const type = contentType(path);

      if (type) {
        ctx.response.setHeader('content-type', type);
      }
    } else {
      throw new BadRequest('not a read stream')
    }
  }
}

export function GuessMime() {
  return useDecorators(
    UseAfter(GuessMimeMiddleware),
  );
}