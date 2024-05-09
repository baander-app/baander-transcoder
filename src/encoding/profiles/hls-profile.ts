import * as path from 'node:path';

export const HlsProfile = {
  getProfile(segment: number, segmentLength: number, outDir: string) {
    return [
      '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast',
      '-crf', '25',
      '-sc_threshold', '0',
      '-flags', '+cgop',
      '-force_key_frames', `expr:gte(t,n_forced*${segmentLength})`,
      '-c:a', 'aac',
      '-ac', '2',
      '-sn',
      '-copyts',
      '-avoid_negative_ts', 'disabled',
      '-f', 'hls',
      '-start_number', `${segment}`,
      '-hls_time', `${segmentLength}`,
      '-hls_segment_type', 'mpegts',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(outDir, '%d.ts'),
      path.join(outDir, 'manifest.m3u8'),
    ];
  },
};