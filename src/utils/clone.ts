export function clone<T>(object: T): T {
  return JSON.parse(JSON.stringify(object));
}