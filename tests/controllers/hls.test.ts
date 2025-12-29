import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { hlsRouter } from '../../src/controllers/hls';
import { dashRouter } from '../../src/controllers/dash';
import { mediaService } from '../../src/services/media';
import * as hls from '../../src/services/hls';
import * as dash from '../../src/services/dash';
import * as ffmpeg from '../../src/services/ffmpeg';


vi.mock('../../src/services/media');
vi.mock('../../src/services/hls');
vi.mock('../../src/services/dash');
vi.mock('../../src/services/ffmpeg');
vi.mock('../../src/services/mediaTranscoder', () => ({
  getMediaTranscoder: vi.fn(),
  mediaTranscodeOptions: {
    variants: [{ height: 720, bitrate: '2500k' }],
    audio: { codec: 'aac', bitrate: '128k', channels: 2 },
    segmentDuration: 5,
    hlsSegmentType: 'mpegts',
    hwAccel: 'cpu',
    videoCodec: 'h264',
    lowLatency: false
  }
}));
vi.mock('../../src/services/logger');

const app = express();
app.use('/api/hls', hlsRouter);
app.use('/api', dashRouter);

describe('Media API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /playlist/:path', () => {
    it('should return HLS playlist with .m3u8 extension', async () => {
      (mediaService.getEntry as any).mockResolvedValue({ id: '1', path: '/video.mp4' });
      (mediaService.getCaptions as any).mockResolvedValue([]);
      (hls.generatePlaylist as any).mockResolvedValue('#EXTM3U...');

      const res = await request(app).get('/api/hls/playlist/video.mp4.m3u8');
      expect(res.status).toBe(200);
      expect(res.text).toContain('#EXTM3U');
    });

    it('should return HLS playlist without .m3u8 extension', async () => {
      (mediaService.getEntry as any).mockResolvedValue({ id: '1', path: '/video.mp4' });
      (mediaService.getCaptions as any).mockResolvedValue([]);
      (hls.generatePlaylist as any).mockResolvedValue('#EXTM3U...');

      const res = await request(app).get('/api/hls/playlist/video.mp4');
      expect(res.status).toBe(200);
      expect(res.text).toContain('#EXTM3U');
    });

    it('should handle 404', async () => {
      (mediaService.getEntry as any).mockRejectedValue(new Error('Not found'));
      const res = await request(app).get('/api/hls/playlist/missing');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /dash/manifest/:path', () => {
      it('should return DASH manifest', async () => {
          (mediaService.getEntry as any).mockResolvedValue({ id: '1', path: '/video.mp4' });
          (mediaService.getCaptions as any).mockResolvedValue([]);
          (dash.generateDashManifest as any).mockResolvedValue('<MPD...>');

          const res = await request(app).get('/api/dash/manifest/video.mp4');
          expect(res.status).toBe(200);
          expect(res.text).toContain('<MPD');
          expect(res.headers['content-type']).toContain('application/dash+xml');
      });
  });
});
