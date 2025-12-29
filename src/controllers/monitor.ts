import * as express from 'express';
import * as os from 'os';
import { transcoders } from '../services/transcoder';
import { queueManager } from '../services/queueManager';

export const monitorRouter = express.Router();

monitorRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

monitorRouter.get('/monitor', (req, res) => {
  const activeSessions = [];

  for (const [key, transcoder] of transcoders.entries()) {
    if (transcoder.isRunning) {
        const sessions = transcoder.getSessions();
        for (const session of sessions) {
            activeSessions.push({
                sessionId: session.id,
                inputSource: transcoder.getInputSource(),
                height: session.height,
                format: session.format,
                startTime: transcoder.getLastRequestTime().toISOString(), 
                segmentsGenerated: transcoder.getAvailableSegmentsCount(session.id)
            });
        }
    }
  }

  const memoryUsage = process.memoryUsage();

  const metrics = {
    system: {
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      }
    },
    process: {
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      }
    },
    transcoding: {
      activeSessionsCount: activeSessions.length,
      sessions: activeSessions
    },
    queues: queueManager.getMetrics(),
    timestamp: new Date().toISOString()
  };

  res.json(metrics);
});
