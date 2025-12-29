import * as express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { Config, IS_DEV } from '../config';
import { createIndexes } from '../state';
import { hlsRouter } from '../controllers/hls';
import { dashRouter } from '../controllers/dash';
import { streamRouter } from '../controllers/stream';
import { captionRouter } from '../controllers/caption';
import { audioRouter } from '../controllers/audio';
import { libraryRouter } from '../controllers/library';
import { testRouter } from '../controllers/test';
import { monitorRouter } from '../controllers/monitor';
import { setMediaTranscodeOptions } from '../services/mediaTranscoder';
import { setMetadataPath } from '../services/media';

export function setup(app: express.Application, config: Config) {
  setMediaTranscodeOptions(config.transcode!);
  setMetadataPath(config.metadataPath || 'trickplay');
  createIndexes(config);

  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

  app.use(compression());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Surrogate-Control', 'no-store');
    res.header('Server', 'baander-transcoder');
    next();
  });

  const apiRouter = express.Router();
  apiRouter.use('/hls', hlsRouter);
  apiRouter.use(dashRouter);
  apiRouter.use(streamRouter);
  apiRouter.use(captionRouter);
  apiRouter.use('/audio', audioRouter);
  apiRouter.use(libraryRouter);
  apiRouter.use(monitorRouter);

  if (IS_DEV) {
    apiRouter.use('/test', testRouter);
  }

  app.use('/api', apiRouter);
  ;
}
