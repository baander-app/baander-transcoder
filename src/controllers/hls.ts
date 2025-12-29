import * as express from 'express';
import {
  generateIFramePlaylist,
  generateMasterPlaylist,
  generatePlaylist,
  RESOLUTION_PLACEHOLDER,
  SEGMENT_PLACEHOLDER,
} from '../services/hls';
import { getClientInfoFromRequest } from '../utils/clientDetection';
import { getMediaTranscoder, mediaTranscodeOptions } from '../services/mediaTranscoder';
import { mediaService } from '../services/media';
import { getOptionsOverride, handleError } from './utils';
import { router } from '../services/router';
import { getPlaylistCache, getRateLimiter } from '../services/http';
import { getSegmentExtension } from '../utils/paths';
import { getVideoInfo } from '../services/ffmpeg';
import { logger } from '../services/logger';
import path from 'path';

export const hlsRouter = express.Router();

hlsRouter.get('/playlist/:id{.m3u8}', getRateLimiter().middleware(), async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    logger.debug(`[HLS] Playlist request: ${req.originalUrl}`);
    const cached = getPlaylistCache().get(cacheKey);
    if (cached) {
      logger.debug(`[HLS] Serving cached playlist for: ${req.originalUrl}`);
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(cached);
      return;
    }

    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    logger.debug(`[HLS] Resolved playlist entry path: ${entry.path}`);
    const captions = await mediaService.getCaptions(entry, req.protocol, req.headers.host!);
    const overrides = getOptionsOverride(req);
    const options = {...mediaTranscodeOptions, ...overrides};

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    let playlist: string;

    if (options.variants.length > 1 || captions.length > 0) {
      playlist = await generateMasterPlaylist(entry.path, req.protocol, req.headers.host!, pathParam, captions, options);
    } else {
      const template = router.url('hls.segment', {
        height: RESOLUTION_PLACEHOLDER,
        segment: `segment_${SEGMENT_PLACEHOLDER}.${getSegmentExtension(options.hlsSegmentType === 'fmp4')}`,
        id: pathParam,
      }, req);

      let initUrl = undefined;
      if (options.hlsSegmentType === 'fmp4') {
        initUrl = router.url('hls.init', {
          height: options.variants[0].height,
          id: pathParam,
        }, req);
      }

      const qs = new URLSearchParams(req.query as any).toString();
      if (qs) {
        const q = `?${qs}`;
        const templateWithQuery = `${template}${q}`;
        if (initUrl) initUrl += q;

        playlist = await generatePlaylist(templateWithQuery, entry.path, options.variants[0].height, options, initUrl);
      } else {
        playlist = await generatePlaylist(template, entry.path, options.variants[0].height, options, initUrl);
      }
    }

    getPlaylistCache().set(cacheKey, playlist);
    res.send(playlist);
  } catch (err) {
    handleError(err, res);
  }
});

hlsRouter.get('/variant/:height/playlist/:id{.m3u8}', getRateLimiter().middleware(), async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    logger.debug(`[HLS] Variant playlist request: ${req.originalUrl}`);
    const cached = getPlaylistCache().get(cacheKey);
    if (cached) {
      logger.debug(`[HLS] Serving cached variant playlist: ${req.originalUrl}`);
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(cached);
      return;
    }

    let height = parseInt(req.params.height, 10);
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);

    // Handle original variant (height = -1)
    let isOriginal = false;
    if (height === -1) {
      const videoInfo = await getVideoInfo(entry.path);
      height = videoInfo.height;
      isOriginal = true;
    }

    logger.debug(`[HLS] Resolved variant playlist entry path: ${entry.path} (height: ${height}${isOriginal ? ', original quality' : ''})`);
    const overrides = getOptionsOverride(req);
    const options = {...mediaTranscodeOptions, ...overrides};

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    const template = router.url('hls.segment', {
      height: height,
      segment: `segment_${SEGMENT_PLACEHOLDER}.${getSegmentExtension(options.hlsSegmentType === 'fmp4')}`,
      id: pathParam,
    }, req);

    let initUrl = undefined;
    if (options.hlsSegmentType === 'fmp4') {
      initUrl = router.url('hls.init', {
        height: height,
        id: pathParam,
      }, req);
    }

    const qs = new URLSearchParams(req.query as any).toString();
    if (qs) {
      const q = `?${qs}`;
      const templateWithQuery = `${template}${q}`;
      if (initUrl) initUrl += q;

      const playlist = await generatePlaylist(templateWithQuery, entry.path, height, options, initUrl);
      getPlaylistCache().set(cacheKey, playlist);
      res.send(playlist);
    } else {
      const playlist = await generatePlaylist(template, entry.path, height, options, initUrl);
      getPlaylistCache().set(cacheKey, playlist);
      res.send(playlist);
    }
  } catch (err) {
    handleError(err, res);
  }
});

hlsRouter.get('/i-frame-playlist/:id{.m3u8}', getRateLimiter().middleware(), async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    const cached = getPlaylistCache().get(cacheKey);
    if (cached) {
      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(cached);
      return;
    }

    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const host = `${req.protocol}://${req.headers.host}`;
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    const playlist = await generateIFramePlaylist(entry.path, host, pathParam);

    getPlaylistCache().set(cacheKey, playlist);
    res.send(playlist);
  } catch (err) {
    handleError(err, res);
  }
});

hlsRouter.get('/segments/:height/init/:id', async (req, res) => {
  try {
    let height = parseInt(req.params.height, 10);
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);

    // Handle original variant (height = -1)
    if (height === -1) {
      const videoInfo = await getVideoInfo(entry.path);
      height = videoInfo.height;
    }

    logger.debug(`[HLS] Init segment request: ${pathParam} (height: ${height})`);
    const overrides = getOptionsOverride(req);
    const transcoder = getMediaTranscoder(entry.id, entry.path, overrides);
    const initPath = await transcoder.requestHlsInit(height);
    logger.debug(`[HLS] Serving init segment from: ${initPath}`);
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(path.resolve(initPath));
  } catch (err) {
    handleError(err, res);
  }
});

hlsRouter.get('/segments/:height/:segment/:id', async (req, res) => {
  try {
    // Debug logging to help identify parameter issues
    logger.debug(`[HLS] Segment route params:`, req.params);
    logger.debug(`[HLS] Full URL: ${req.originalUrl}`);

    let height = parseInt(req.params.height, 10);
    const segmentStr = req.params.segment;

    // Validate that segment parameter exists
    if (!segmentStr) {
      logger.error(`[HLS] Missing segment parameter. Raw params:`, req.params);
      logger.error(`[HLS] Full URL when segment missing: ${req.originalUrl}`);
      return handleError(new Error('Missing segment parameter'), res);
    }

    const segmentMatch = segmentStr.match(/segment_(\d+)\.(?:ts|m4s)/);
    if (!segmentMatch || !segmentMatch[1]) {
      logger.error(`[HLS] Invalid segment request: '${segmentStr}' (height: ${height}, id: ${req.params.id}). Raw Params:`, req.params);
      return handleError(new Error('Invalid segment format'), res);
    }
    const segment = parseInt(segmentMatch[1], 10);

    if (isNaN(segment)) {
      logger.error(`[HLS] Invalid segment request: '${segmentStr}' (height: ${height}, id: ${req.params.id}). Raw Params:`, req.params);
    }

    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);

    // Handle original variant (height = -1)
    if (height === -1) {
      const videoInfo = await getVideoInfo(entry.path);
      height = videoInfo.height;
    }

    // Add headers to help client with ABR decisions
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range');

    logger.debug(`[HLS] Segment request: ${pathParam} (height: ${height}, segment: ${segment})`);
    const overrides = getOptionsOverride(req);
    const transcoder = getMediaTranscoder(entry.id, entry.path, overrides);
    const segmentPath = await transcoder.requestSegment(segment, height);
    logger.debug(`[HLS] Serving segment from: ${segmentPath}`);

    if (segmentPath.endsWith('.m4s')) {
      res.setHeader('Content-Type', 'video/iso.segment');
    } else {
      res.setHeader('Content-Type', 'video/mp2t');
    }

    res.sendFile(path.resolve(segmentPath));
  } catch (err) {
    handleError(err, res);
  }
});

// Add a configuration endpoint for HLS player settings
hlsRouter.get('/config/:id', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const videoInfo = await getVideoInfo(entry.path);
    const overrides = getOptionsOverride(req);
    const options = {...mediaTranscodeOptions, ...overrides};

    // Return player configuration
    const config = {
      hlsConfig: {
        maxBufferLength: 10,
        lowLatencyMode: options.lowLatency,

      },
      videoInfo: {
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
        frameRate: videoInfo.frameRate,
        bitrate: videoInfo.format.bit_rate ? parseInt(videoInfo.format.bit_rate) : 0,
        segmentDuration: options.segmentDuration,
        variantCount: options.variants.length,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.json(config);
  } catch (err) {
    handleError(err, res);
  }
});

hlsRouter.get('/i-frame/:index/:id', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const transcoder = getMediaTranscoder(entry.id, entry.path);
    const iFramePath = await transcoder.requestIFrame(index);
    res.setHeader('Content-Type', 'video/mp2t');
    res.sendFile(path.resolve(iFramePath));
  } catch (err: unknown) {
    handleError(err, res);
  }
});
