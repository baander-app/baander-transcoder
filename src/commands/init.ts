import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { logger } from '../services/logger';
import { Config } from '../config';

const defaultConfig: Config = {
  'folders': [
    {
      id: 'videos',
      'path': './videos',
      'title': 'My Videos',
      'scanInterval': 300,
    },
  ],
  'transcode': {
    'variants': [
      {
        'id': 'original',
        'height': -1,
        'bitrate': 'original',
      },
      {
        'id': '1080p',
        'height': 1080,
        'bitrate': '5000k',
      },
      {
        'id': '720p',
        'height': 720,
        'bitrate': '2800k',
      },
      {
        'id': '480p',
        'height': 480,
        'bitrate': '1400k',
      },
    ],
    'preset': 'fast',
    'audio': {
      'bitrate': '192k',
      'channels': 2,
      'defaultCodec': 'aac',
    },
    'trickplay': true,
    'onDemand': true,
    'idleTimeout': 5,
    'throttleBufferSize': 300,
    'minThrottleBufferSize': 60,
    'segmentDuration': 6,
    'hwAccel': 'cpu',
    'videoCodec': 'h264',
    'hlsSegmentType': 'fmp4',
    'lowLatency': false,
    'audioOnly': false,
    'maxTranscoders': 2,
  },
  'ffmpeg': 'ffmpeg',
  'ffprobe': 'ffprobe',
  'logging': {
    'level': 'info',
    'directory': 'logs',
    'maxSize': '20m',
    'maxFiles': '14d',
  },
  'cleanup': {
    'interval': 600,
    'maxAge': 86400,
    'strategy': 'mtime',
  },
  'iframePath': 'metadata',
  'metadataPath': 'trickplay',
  'generateMetadataInterval': 3600,
};

export async function provisionDefaultConfig() {
  const configPath = path.resolve(process.cwd(), 'config.json');

  try {
    await fs.access(configPath);
    logger.info('config.json already exists. Skipping default config provisioning.');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.info('config.json not found. Provisioning default config...');
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
      logger.info('Default config.json created successfully.');
    } else {
      logger.error('Error checking for config.json:', error);
    }
  }
}
