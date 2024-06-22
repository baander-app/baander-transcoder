import { Middleware, MiddlewareMethods } from '@tsed/platform-middlewares';
import { Context } from '@tsed/platform-params';

@Middleware()
export class JsonResponse implements MiddlewareMethods {
  use(@Context() $ctx: Context) {
    $ctx.response.setHeader('content-type', 'application/json');
  }
}