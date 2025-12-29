import cluster from 'cluster';
import * as commander from 'commander';
import { getConfig } from '../config';
import { initApplication } from '../services/init';
import { setup } from '../api';
import express from 'express';
import { extractIFrame, Segmenter } from '../workers/segmenter';
import { setFFmpegPaths } from '../services/ffmpeg';
import { configureLogger, logger } from '../services/logger';
import { CleanupManager } from '../services/cleanupManager';
import { MetadataWorker } from '../workers/metadataWorker';
import { queueManager } from '../services/queueManager';
import { validatePaths } from '../services/validator';
import { ipcServer, type IPCMessageRegistry } from '../ipc';
import { SocketServer } from '../socket';

export function registerServeCommand(program: commander.Command) {
  const serveCmd = program.command('serve');
  serveCmd.option('-c, --config <path>', 'config file', './config.json');
  serveCmd.option('-d, --data-dir <path>', 'data directory', '.baander-transcoder');
  serveCmd.option('-l, --listen <addr>', 'listen address', '127.0.0.1:8080');
  serveCmd.option('-s, --socket <path>', 'enable Unix socket server at path');
  serveCmd.option('--verbose', 'enable verbose logging');
  serveCmd.action(async (options) => {
    if (cluster.isPrimary) {
      cluster.setupPrimary({args: process.argv.slice(2)}); // Pass original args to preserve options
      cluster.fork({TYPE: 'web'});
      cluster.fork({TYPE: 'transcoder'});
      cluster.fork({TYPE: 'queue'});

      cluster.on('message', (worker, message, handle) => {
        // Route messages
        for (const id in cluster.workers) {
          const w = cluster.workers[id];
          if (w !== worker) w!.send(message);
        }
      });

    } else { // This is a worker process
      await initApplication(options.dataDir, options.config);
      const config = getConfig(options.config);

      if (options.verbose) {
        if (!config.logging) {
          config.logging = {level: 'debug', directory: 'logs', maxSize: '20m', maxFiles: '14d'};
        } else {
          config.logging.level = 'debug';
        }
      }

      // Override socket config from CLI options
      if (options.socket !== undefined) {
        if (!config.socket) {
          config.socket = {
            enabled: true,
            path: options.socket,
            maxMessageSize: 100 * 1024 * 1024,
            connectionTimeout: 30000,
          };
        } else {
          config.socket.enabled = true;
          config.socket.path = options.socket;
        }
      }

      setFFmpegPaths(config.ffmpeg!, config.ffprobe!);
      if (config.logging) {
        configureLogger(config.logging);
      }

      await validatePaths(config);

      if (process.env.TYPE === 'web') {
        const app = express();
        setup(app, config);

        // Load queued tasks
        await queueManager.loadAll();

        let cleanupManager: CleanupManager | null = null;
        if (config.cleanup) {
          cleanupManager = new CleanupManager(config.cleanup);
          cleanupManager.start();
        }

        // Start HTTP server
        const [host, port] = options.listen.split(':');
        const server = app.listen(parseInt(port), host, () => {
          logger.info(`Web server running at http://${host}:${port}`);
          logger.debug(app._router);
        });

        // Start Unix socket server if enabled
        let socketServer: SocketServer | null = null;
        if (config.socket?.enabled) {
          socketServer = new SocketServer({
            socketPath: config.socket.path,
            app,
            maxMessageSize: config.socket.maxMessageSize,
            connectionTimeout: config.socket.connectionTimeout,
          });

          await socketServer.start();
          logger.info(`Socket server running on ${config.socket.path}`);

          socketServer.on('connection', (socket) => {
            logger.debug(`New socket connection. Active: ${socketServer?.getConnectionCount()}`);
          });

          socketServer.on('disconnect', (socket) => {
            logger.debug(`Socket connection closed. Active: ${socketServer?.getConnectionCount()}`);
          });

          socketServer.on('error', (err) => {
            logger.error(`Socket server error: ${err.message}`);
          });
        }

        const shutdown = async () => {
          logger.info('Web worker shutting down...');

          await queueManager.saveAll();

          if (cleanupManager) {
            cleanupManager.stop();
          }

          if (socketServer) {
            await socketServer.stop();
            logger.info('Socket server closed.');
          }

          server.close(() => {
            logger.info('HTTP server closed.');
            process.exit(0);
          });

          setTimeout(() => {
            logger.error('Forcing web worker shutdown...');
            process.exit(1);
          }, 5000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

      } else if (process.env.TYPE === 'metadata') {
        const metadataWorker = new MetadataWorker(config);
        metadataWorker.start();
      } else if (process.env.TYPE === 'transcoder') {
        const sessions = new Map<string, Segmenter>();

        const shutdown = () => {
          logger.info('Transcoder worker shutting down...');
          for (const [sessionId, segmenter] of sessions) {
            logger.info(`Killing session ${sessionId}`);
            segmenter.stop();
          }
          sessions.clear();
          process.exit(0);

        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

        // Set up typed IPC message handlers
        ipcServer.onMessage('startSession', async (data: IPCMessageRegistry['startSession']) => {
          const {sessionId, file, config, variantId, outputDir, format, startTime, startNumber, videoStreamIndex} = data;

          if (sessions.has(sessionId)) {
            ipcServer.send('sessionStarted', { sessionId });
            return;
          }

          try {
            logger.info(`Starting transcoding session ${sessionId} (${format}) for ${file}`);

            const segmenter = new Segmenter({
              input: file,
              outputDir,
              config,
              variantId,
              startTime,
              startNumber,
              format: format || 'hls',
              videoStreamIndex,
            });

            segmenter.on('segmentAvailable', (segment: string) => {
              ipcServer.send('segmentAvailable', { sessionId, segment });
            });

            segmenter.on('stderr', (data: string) => {
              logger.error(`[ffmpeg ${sessionId}] ${data.trim()}`);
            });

            segmenter.on('exit', (code: number) => {
              if (code !== 0 && code !== null) {
                logger.error(`Session ${sessionId} exited with code ${code}`);
              } else {
                logger.info(`Session ${sessionId} stopped`);
              }
              sessions.delete(sessionId);
              ipcServer.send('sessionStopped', { sessionId, code });
            });

            segmenter.on('error', (err: Error) => {
              logger.error(`Session ${sessionId} error: ${err}`);
              ipcServer.send('sessionError', { sessionId, error: err.message });
            });

            await segmenter.start();
            sessions.set(sessionId, segmenter);

            ipcServer.send('sessionStarted', { sessionId });
          } catch (error) {
            const errorMessage = (error as Error).message;
            logger.error(`Failed to start session ${sessionId}: ${errorMessage}`);
            ipcServer.send('sessionError', { sessionId, error: errorMessage });
          }
        });

        ipcServer.onMessage('stopSession', (data: IPCMessageRegistry['stopSession']) => {
          const {sessionId} = data;
          const segmenter = sessions.get(sessionId);
          if (segmenter) {
            segmenter.stop();
            sessions.delete(sessionId);
          }
        });

        ipcServer.onMessage('pauseSession', (data: IPCMessageRegistry['pauseSession']) => {
          const {sessionId} = data;
          const segmenter = sessions.get(sessionId);
          segmenter?.pause();
        });

        ipcServer.onMessage('resumeSession', (data: IPCMessageRegistry['resumeSession']) => {
          const {sessionId} = data;
          const segmenter = sessions.get(sessionId);
          segmenter?.resume();
        });

        ipcServer.onMessage('extractIFrame', async (data: IPCMessageRegistry['extractIFrame']) => {
          const {file, index, requestId} = data;
          try {
            const path = await extractIFrame(file, index);
            ipcServer.send('iFrameResponse', { requestId, data: {path} });
          } catch (error) {
            const errorMessage = (error as Error).message;
            logger.error(`IFrame extraction failed for index ${index} of ${file}: ${errorMessage}`);
            ipcServer.send('iFrameResponse', { requestId, data: {error: errorMessage} });
          }
        });
      }
    }
  });
}
