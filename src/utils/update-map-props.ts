export function updateMapProps<K, V extends Record<string, any>>(map: Map<K, V>, key: K, newProperties: Partial<V>): void {
  const object = map.get(key);
  if (object) {
    Object.assign(object, newProperties);
    map.set(key, object);
  } else {
    throw new Error(`No object found in the map with the key: ${key}`);
  }
}