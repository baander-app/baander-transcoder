import { describe, it, expect } from 'vitest';
import { router, RouteId } from '../../src/services/router';

describe('RouterService', () => {
  it('should register and retrieve routes', () => {
    router.register('test.route' as RouteId, '/api/test/:id');
    const route = router.getById('test.route' as RouteId);
    expect(route).toBeDefined();
    expect(route.path).toBe('/api/test/:id');
  });

  it('should generate URLs with parameter substitution', () => {
    router.register('test.param' as RouteId, '/api/test/:id/:name');
    const url = router.url('test.param' as RouteId, { id: 123, name: 'test' });
    expect(url).toBe('/api/test/123/test');
  });

  it('should handle .m3u8 suffix correctly', () => {
    router.register('test.suffix' as RouteId, '/api/test/:id{.m3u8}');
    const url = router.url('test.suffix' as RouteId, { id: 'myvideo' });
    expect(url).toBe('/api/test/myvideo.m3u8');
  });

  it('should preserve placeholders like __SEGMENT__', () => {
    // The regex in router.url handles this.
    // path = path.replace(/\{([.][^}]+)\}/g, '$1');
    // This regex matches { followed by . followed by chars not } followed by }.
    // It should NOT match __SEGMENT__.
    
    router.register('test.segment' as RouteId, '/api/test/:segment/file');
    const url = router.url('test.segment' as RouteId, { segment: '__SEGMENT__' });
    expect(url).toBe('/api/test/__SEGMENT__/file');
  });

  it('should handle init segment URL generation correctly', () => {
    // Simulating hls.init route
    router.register('hls.init', '/api/hls/segments/:height/init/:id');
    const url = router.url('hls.init', { height: 720, id: 'abc' });
    expect(url).toBe('/api/hls/segments/720/init/abc');
  });
});