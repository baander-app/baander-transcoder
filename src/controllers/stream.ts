import * as express from 'express';
import * as path from 'path';
import mime from 'mime';
import { getDownloadPath, startDirectStream } from '../services/ffmpeg';
import { mediaService } from '../services/media';
import { logger } from '../services/logger';
import { handleError } from './utils';

export const streamRouter = express.Router();

streamRouter.get('/stream/:id', async (req, res) => {
  try {
    req.params;
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const start = req.query.start as string | undefined;

    res.set('Content-Type', 'video/mp4');
    const proc = await startDirectStream(entry.path, start);

    if (proc.stdout) {
      proc.stdout.pipe(res);
    } else {
      throw new Error('Failed to start direct stream: stdout is null');
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        // logger.debug(`Direct stream stderr: ${data}`);
      });
    }

    req.on('close', () => {
      proc.kill();
      logger.info('Direct stream client disconnected, killed ffmpeg');
    });
  } catch (err) {
    handleError(err, res);
  }
});

streamRouter.get('/download/:id', async (req, res) => {
  try {
    const pathParam = req.params.id;
    const entry = await mediaService.getEntry(pathParam);
    const start = req.query.start as string | null;
    const duration = req.query.duration as string | null;
    const downloadPath = await getDownloadPath(entry.path, start, duration);
    res.set('Content-Disposition', `attachment; filename="${path.basename(downloadPath)}"`);
    res.set('Content-Type', mime.getType(downloadPath) || 'application/octet-stream');
    res.sendFile(downloadPath);
  } catch (err) {
    handleError(err, res);
  }
});
