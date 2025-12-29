import * as express from 'express';
import * as path from 'path';
import { getCaptionPath, getFramePath } from '../services/ffmpeg';
import { mediaService } from '../services/media';
import { handleError } from './utils';

export const captionRouter = express.Router();

captionRouter.get('/frame/:id', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    let time = 30;
    if (req.query.t) time = parseInt(req.query.t as string, 10);
    const framePath = await getFramePath(entry.path, time);
    res.set('Content-Type', 'image/jpeg');
    res.sendFile(framePath);
  } catch (err) {
    handleError(err, res);
  }
});

captionRouter.get('/captionlist/:id', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const captions = await mediaService.getCaptions(entry, req.protocol, req.headers.host!);
    res.json(captions);
  } catch (err) {
    handleError(err, res);
  }
});

captionRouter.get('/captions/:id', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const captionPath = await getCaptionPath(entry.path);
    res.set('Content-Type', 'text/vtt');
    res.sendFile(captionPath);
  } catch (err) {
    handleError(err, res);
  }
});

captionRouter.get('/trickplay/:id/playlist.m3u8', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const dir = mediaService.getTrickplayDir(entry);
    res.sendFile(path.join(dir, 'tiles.m3u8'));
  } catch (err) {
    handleError(err, res);
  }
});

captionRouter.get('/trickplay/:id/:filename', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const filename = req.params.filename;
    // Validate filename to ensure it matches thumb_\d+\.jpg pattern
    if (!/^thumb_\d+\.jpg$/.test(filename)) {
      return res.status(400).send('Invalid trickplay filename');
    }
    const entry = await mediaService.getEntry(pathParam);
    const dir = mediaService.getTrickplayDir(entry);
    res.sendFile(path.join(dir, filename));
  } catch (err) {
    handleError(err, res);
  }
});
