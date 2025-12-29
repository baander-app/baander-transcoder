import * as express from 'express';
import { logger } from '../services/logger';
import { transcodeOptions, TranscodeOptions } from '../services/transcoder';

export function handleError(err: any, res: express.Response) {
  if (err.message === 'Not found') {
    res.status(404).send('Not found');
  } else {
    logger.error(`ERROR: ${err}`);
    res.status(500).send({
      error: err.message,
    });
  }
}

export function getOptionsOverride(req: express.Request): Partial<TranscodeOptions> {
  const override: any = {};
  if (req.query.vcodec) override.videoCodec = req.query.vcodec;
  if (req.query.acodec) override.audio = {...transcodeOptions.audio, codec: req.query.acodec};
  if (req.query.hwaccel) override.hwAccel = req.query.hwaccel;
  if (req.query.lowLatency === 'true') override.lowLatency = true;
  return override;
}
