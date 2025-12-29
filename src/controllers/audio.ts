import * as express from 'express';
import { generateAudioPlaylist, generateMasterPlaylist, SEGMENT_PLACEHOLDER } from '../services/hls';
import { getMediaTranscoder, mediaTranscodeOptions } from '../services/mediaTranscoder';
import { mediaService } from '../services/media';
import { getOptionsOverride, handleError } from './utils';
import { router } from '../services/router';
import { getSegmentExtension } from '../utils/paths';
import { logger } from '../services/logger';
import path from 'path';

export const audioRouter = express.Router();

// Audio Playlist for a specific track index
// /api/audio/:index/playlist/:id{.m3u8}
audioRouter.get('/:index/playlist/:id{.m3u8}', async (req, res) => {
  //@ts-ignore
  req.params.m3u8;

  try {
    const index = parseInt(req.params.index, 10);
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const overrides = getOptionsOverride(req);
    const options = {...mediaTranscodeOptions, ...overrides};

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    // Template points to audio controller segment route
    const template = router.url('audio.segment', {
      index: index,
      segment: `segment_${SEGMENT_PLACEHOLDER}.${getSegmentExtension(options.hlsSegmentType === 'fmp4')}`,
      id: pathParam,
    }, req);

    let initUrl = undefined;
    if (options.hlsSegmentType === 'fmp4') {
      initUrl = router.url('audio.init', {
        index: index,
        id: pathParam,
      }, req);
    }

    const qs = new URLSearchParams(req.query as any).toString();
    if (qs) {
      const q = `?${qs}`;
      const templateWithQuery = `${template}${q}`;
      if (initUrl) initUrl += q;

      const playlist = await generateAudioPlaylist(templateWithQuery, entry.path, index, options, initUrl);
      res.send(playlist);
    } else {
      const playlist = await generateAudioPlaylist(template, entry.path, index, options, initUrl);
      res.send(playlist);
    }
  } catch (err) {
    handleError(err, res);
  }
});

// Audio Segment
// /api/audio/:index/segment/:segment/:id{.:ext}
audioRouter.get('/:index/segment/:segment/:id{.:ext}', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const segmentStr = req.params.segment;
    const segmentMatch = segmentStr.match(/segment_(\d+)\.(?:ts|m4s)/);
    if (!segmentMatch || !segmentMatch[1]) {
      logger.error(`[Audio] Invalid segment request: '${segmentStr}' (index: ${index}, id: ${req.params.id}). Raw Params:`, req.params);
      return handleError(new Error('Invalid segment format'), res);
    }
    const segment = parseInt(segmentMatch[1], 10);
    const pathParam = req.params.ext ? `${req.params.id}.${req.params.ext}` : req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const overrides = getOptionsOverride(req);
    const transcoder = getMediaTranscoder(entry.id, entry.path, overrides);

    const segmentPath = await transcoder.requestHlsAudioSegment(segment, index);

    if (segmentPath.endsWith('.m4s')) {
      res.setHeader('Content-Type', 'audio/iso.segment');
    } else {
      res.setHeader('Content-Type', 'audio/mp2t');
    }

    res.sendFile(path.resolve(segmentPath));
  } catch (err) {
    handleError(err, res);
  }
});

// Init segment for fMP4 audio?
// /api/audio/:index/init/:id{.:ext}
audioRouter.get('/:index/init/:id{.:ext}', async (req, res) => {
  try {
    const index = parseInt(req.params.index, 10);
    const pathParam = req.params.ext ? `${req.params.id}.${req.params.ext}` : req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const overrides = getOptionsOverride(req);
    const transcoder = getMediaTranscoder(entry.id, entry.path, overrides);

    const initPath = await transcoder.requestHlsAudioInit(index);
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(path.resolve(initPath));
  } catch (err) {
    handleError(err, res);
  }
});

// Master Playlist (Audio Only)
audioRouter.get('/playlist/:id{.m3u8}', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const overrides = getOptionsOverride(req);
    const options = {...mediaTranscodeOptions, ...overrides, audioOnly: true};

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    const playlist = await generateMasterPlaylist(entry.path, req.protocol, req.headers.host!, pathParam, [], options);
    res.send(playlist);
  } catch (err) {
    handleError(err, res);
  }
});
