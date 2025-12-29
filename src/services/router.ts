import { Request } from 'express';

export type RouteId =
  | 'hls.playlist'
  | 'hls.variant'
  | 'hls.iframe_playlist'
  | 'hls.segment'
  | 'hls.init'
  | 'hls.iframe'
  | 'hls.config'
  | 'dash.manifest'
  | 'dash.init'
  | 'dash.chunk'
  | 'audio.playlist'
  | 'audio.segment'
  | 'audio.init'
  | 'audio.master_playlist'
  | 'stream.direct'
  | 'stream.download'
  | 'caption.frame'
  | 'caption.list'
  | 'caption.vtt'
  | 'caption.trickplay'
  | 'caption.thumbnail'
  | 'library.item'
  | 'library.all'
  | 'test.hls';

export interface RouteDefinition {
  id: RouteId;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

class RouterService {
  private routes: Map<RouteId, RouteDefinition> = new Map();

  register(id: RouteId, path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET') {
    this.routes.set(id, {id, path, method});
  }

  getById(id: RouteId): RouteDefinition {
    const route = this.routes.get(id);
    if (!route) {
      throw new Error(`Route with ID [${id}] not found.`);
    }
    return route;
  }

  url(id: RouteId, params: Record<string, string | number> = {}, req?: Request): string {
    const route = this.getById(id);
    let path = route.path;

    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`:${key}\\b`, 'g');
      path = path.replace(regex, String(value));
    }

    // Specifically handle Express-style optional suffix patterns like '{.m3u8}' or '{.vtt}'.
    // This transforms '/path/to/id{.m3u8}' to '/path/to/id.m3u8'.
    path = path.replace(/\{([.][^}]+)\}/g, '$1');

    if (req) {
      return `${req.protocol}://${req.get('host')}${path}`;
    }

    return path;
  }
}

export const router = new RouterService();

// Register known routes
// HLS
router.register('hls.playlist', '/api/hls/playlist/:id{.m3u8}');
router.register('hls.variant', '/api/hls/variant/:height/playlist/:id{.m3u8}');
router.register('hls.iframe_playlist', '/api/hls/i-frame-playlist/:id{.m3u8}');
router.register('hls.segment', '/api/hls/segments/:height/:segment/:id');
router.register('hls.init', '/api/hls/segments/:height/init/:id');
router.register('hls.iframe', '/api/hls/i-frame/:index/:id');
router.register('hls.config', '/api/hls/config/:id');

// DASH
router.register('dash.manifest', '/api/dash/manifest/:id');
router.register('dash.init', '/api/dash/init/:repId/:id');
router.register('dash.chunk', '/api/dash/chunk/:repId/:number/:id');

// Audio
router.register('audio.playlist', '/api/audio/:index/playlist/:id{.m3u8}');
router.register('audio.segment', '/api/audio/:index/segment/:segment/:id');
router.register('audio.init', '/api/audio/:index/init/:id');
router.register('audio.master_playlist', '/api/audio/playlist/:id{.m3u8}');

// Stream
router.register('stream.direct', '/api/stream/:id');
router.register('stream.download', '/api/download/:id');

// Caption
router.register('caption.frame', '/api/frame/:id');
router.register('caption.list', '/api/captionlist/:id');
router.register('caption.vtt', '/api/captions/:id');
router.register('caption.trickplay', '/api/trickplay/:id/playlist{.m3u8}');
router.register('caption.thumbnail', '/api/trickplay/:id/:filename');

// Library
router.register('library.item', '/api/item/:id');
router.register('library.all', '/api/library');

// Test
router.register('test.hls', '/api/test/hls/:id');