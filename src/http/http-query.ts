import { Stringable } from '../shared/interfaces';

export class HttpQuery implements Stringable {
  private query: Record<string, string> = {};

  constructor(query?: string) {
    if (query) {
      const queryParts = query.split('&');
      queryParts.forEach((part) => {
        const [key, value] = part.split('=');
        this.query[key] = value;
      });
    }
  }

  get(key: string): string {
    return this.query[key];
  }

  set(key: string, value: string | number): void {
    this.query[key] = `${value}`;
  }

  toString(): string {
    return Object.keys(this.query)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(this.query[key])}`)
      .join('&');
  }
}