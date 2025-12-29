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
import { setTranscodeOptions } from '../services/transcoder';
import { setMetadataPath } from '../services/media';

export function setup(app: express.Application, config: Config) {
  setTranscodeOptions(config.transcode!);
  setMetadataPath(config.metadataPath || 'trickplay');
  createIndexes(config);

  if (IS_DEV) {
    import('errorhandler').then(m => {
      app.use(m.default());
    });
  }
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

  app.use(compression());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    res.header('Surrogate-Control', 'no-store');
    next();
  });

  const apiRouter = express.Router();
  apiRouter.use('/hls', hlsRouter);
  apiRouter.use(dashRouter);
  apiRouter.use(streamRouter);
  apiRouter.use(captionRouter);
  apiRouter.use('/audio', audioRouter);
  apiRouter.use(libraryRouter);
  apiRouter.use('/test', testRouter);
  apiRouter.use(monitorRouter);

  app.use('/api', apiRouter);
  ;
}
