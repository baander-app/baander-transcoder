import * as express from 'express';
import { generateDashManifest } from '../services/dash';
import { getTranscoder, transcodeOptions } from '../services/transcoder';
import { mediaService } from '../services/media';
import { getOptionsOverride, handleError } from './utils';
import { getPlaylistCache, getRateLimiter } from '../services/http';
import { getVideoInfo } from '../services/ffmpeg';
import send from 'send';

export const dashRouter = express.Router();

dashRouter.get('/dash/manifest/:id', getRateLimiter().middleware(), async (req, res) => {
  try {
    const cacheKey = req.originalUrl;
    const cached = getPlaylistCache().get(cacheKey);
    if (cached) {
      res.set('Content-Type', 'application/dash+xml');
      res.send(cached);
      return;
    }

    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const host = `${req.protocol}://${req.headers.host}`;
    const captions = await mediaService.getCaptions(entry, req.protocol, req.headers.host!);
    const overrides = getOptionsOverride(req);

    const mpd = await generateDashManifest(entry.path, host, pathParam, captions, {...transcodeOptions, ...overrides});

    getPlaylistCache().set(cacheKey, mpd);
    res.set('Content-Type', 'application/dash+xml');
    res.send(mpd);
  } catch (err) {
    handleError(err, res);
  }
});

dashRouter.get('/dash/init/:repId/:id', async (req, res) => {
  try {
    const repId = req.params.repId;
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const overrides = getOptionsOverride(req);

    const type = repId.startsWith('v') ? 'video' : 'audio';
    const index = parseInt(repId.substring(1));

    if (index >= transcodeOptions.variants.length) return res.status(404).send('Invalid representation');

    let height = transcodeOptions.variants[index].height;

    // Handle original variant (height = 0 and original = true)
    if (transcodeOptions.variants[index].original) {
      const videoInfo = await getVideoInfo(entry.path);
      height = -1; // Use -1 to indicate original variant in segmenter
    }

    const transcoder = getTranscoder(entry.id, entry.path, overrides);

    const initPath = await transcoder.requestDashInit(height, type);
    res.setHeader('Content-Type', 'video/mp4');
    res.sendFile(initPath);
  } catch (err) {
    handleError(err, res);
  }
});

dashRouter.get('/dash/chunk/:repId/:number/:id', async (req, res) => {
  try {
    const repId = req.params.repId;
    const number = parseInt(req.params.number);
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const overrides = getOptionsOverride(req);

    const type = repId.startsWith('v') ? 'video' : 'audio';
    const index = parseInt(repId.substring(1));

    if (index >= transcodeOptions.variants.length) return res.status(404).send('Invalid representation');

    let height = transcodeOptions.variants[index].height;

    // Handle original variant (height = 0 and original = true)
    if (transcodeOptions.variants[index].original) {
      const videoInfo = await getVideoInfo(entry.path);
      height = -1; // Use -1 to indicate original variant in segmenter
    }

    const transcoder = getTranscoder(entry.id, entry.path, overrides);

    const chunkPath = await transcoder.requestDashChunk(number, height, type);
    res.setHeader('Content-Type', 'video/iso.segment');
    res.sendFile(chunkPath);
  } catch (err) {
    handleError(err, res);
  }
});
