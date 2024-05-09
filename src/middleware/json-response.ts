import { Middleware } from '@tsed/platform-middlewares';
import { Context } from '@tsed/platform-params';

@Middleware()
export class JsonResponse {
  use(@Context() $ctx: Context) {
    $ctx.response.setHeader('content-type', 'application/json');
  }
}