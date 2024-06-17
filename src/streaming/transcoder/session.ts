import { Quality } from './quality';

export class Session {

  constructor(
    public clientId: string,
    public path: string,
    public quality: Quality | null,
    public audioIndex: number,
    public head: number,
  ) {
  }
}