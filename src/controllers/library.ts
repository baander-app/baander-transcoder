import * as express from 'express';
import { libraryService } from '../services/library';
import { logger } from '../services/logger';

export const libraryRouter = express.Router();

libraryRouter.get(/^\/item\/(.*)/, async (req: express.Request, res) => {
  try {
    const pathParam = req.params[0] as string;
    const content = await libraryService.getContent(pathParam);
    res.json(content);
  } catch (err) {
    if ((err as Error).message === 'Not found') {
        res.status(404).send('Not found');
    } else {
        logger.error(`Library error: ${err}`);
        res.status(500).send((err as Error).message);
    }
  }
});

libraryRouter.get('/library', async (req, res) => {
  try {
    const entries = await libraryService.getAllEntries();
    res.json(entries);
  } catch (err) {
    logger.error(`Library error: ${err}`);
    res.status(500).send((err as Error).message);
  }
});
