import { Controller } from '@tsed/di';
import { ContentType, Get } from '@tsed/schema';

@Controller('/hello-world')
export class HelloWorldController {
  @Get('/')
  @ContentType('application/json; charset=utf-8')
  get() {
    return {'hello': 'world'};
  }
}
