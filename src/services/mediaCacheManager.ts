import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { logger } from './logger';
import {
  AudioConfig,
  mediaCachePaths,
  SegmentRequest,
  SegmentStatus,
  SubtitleConfig,
  VideoConfig,
} from '../utils/mediaCachePaths';

export class MediaCacheManager {
  private readonly processingSegments: Map<string, Set<number>> = new Map();
  private readonly processingTimeout: number = 30000; // 30 seconds timeout

  constructor() {
  }

  /**
   * Check if a segment exists in cache
   */
  async checkSegmentStatus(request: SegmentRequest): Promise<SegmentStatus> {
    try {
      let segmentPath: string;

      if ('height' in request.config) {
        // Video segment
        segmentPath = mediaCachePaths.getVideoSegmentPath(
          request.mediaId,
          request.config as VideoConfig,
          request.segmentNumber,
        );
      } else if ('bitrate' in request.config && 'channels' in request.config) {
        // Audio segment
        segmentPath = mediaCachePaths.getAudioSegmentPath(
          request.mediaId,
          request.config as AudioConfig,
          request.segmentNumber,
        );
      } else {
        // Subtitle segment
        segmentPath = mediaCachePaths.getSubtitleSegmentPath(
          request.mediaId,
          request.config as SubtitleConfig,
          request.segmentNumber,
        );
      }

      const exists = await this.fileExists(segmentPath);
      const isProcessing = this.isSegmentProcessing(request);

      return {
        exists,
        path: segmentPath,
        isProcessing: isProcessing && !exists,
      };
    } catch (error) {
      logger.error(`[MediaCacheManager] Error checking segment status: ${error}`);
      return {
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark a segment as being processed to prevent duplicate transcoding
   */
  markSegmentProcessing(request: SegmentRequest): void {
    const key = this.getProcessingKey(request);

    if (!this.processingSegments.has(key)) {
      this.processingSegments.set(key, new Set());
    }

    this.processingSegments.get(key)!.add(request.segmentNumber);

    logger.debug(`[MediaCacheManager] Marked segment as processing: ${key}:${request.segmentNumber}`);

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.markSegmentComplete(request);
    }, this.processingTimeout);
  }

  /**
   * Mark a segment as complete (processing finished)
   */
  markSegmentComplete(request: SegmentRequest): void {
    const key = this.getProcessingKey(request);
    const segments = this.processingSegments.get(key);

    if (segments) {
      segments.delete(request.segmentNumber);
      if (segments.size === 0) {
        this.processingSegments.delete(key);
      }
    }

    logger.debug(`[MediaCacheManager] Marked segment as complete: ${key}:${request.segmentNumber}`);
  }

  async checkInitSegmentStatus(request: { mediaId: string, config: VideoConfig | AudioConfig }): Promise<SegmentStatus> {
    const { mediaId, config } = request;
    let segmentPath: string;

    if ('height' in config) {
      segmentPath = mediaCachePaths.getVideoInitSegmentPath(mediaId, config as VideoConfig);
    } else {
      segmentPath = mediaCachePaths.getAudioInitSegmentPath(mediaId, config as AudioConfig);
    }

    const exists = await this.fileExists(segmentPath);
    return { exists, path: exists ? segmentPath : undefined };
  }

  async storeInitSegment(request: { mediaId: string, config: VideoConfig | AudioConfig }, sourcePath: string): Promise<string> {
    const { mediaId, config } = request;
    let destPath: string;

    if ('height' in config) {
      destPath = mediaCachePaths.getVideoInitSegmentPath(mediaId, config as VideoConfig);
    } else {
      destPath = mediaCachePaths.getAudioInitSegmentPath(mediaId, config as AudioConfig);
    }

    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      logger.debug(`[MediaCacheManager] Stored init segment for ${mediaId} at ${destPath}`);
      return destPath;
    } catch (error) {
      logger.error(`[MediaCacheManager] Failed to store init segment for ${mediaId}: ${error}`);
      throw error;
    }
  }

  async storeSegment(request: SegmentRequest, sourcePath: string): Promise<string> {
    const { mediaId, config, segmentNumber } = request;
    let destPath: string;

    if ('height' in config) {
      destPath = mediaCachePaths.getVideoSegmentPath(mediaId, config as VideoConfig, segmentNumber);
    } else if ('bitrate' in config && 'channels' in config) {
      destPath = mediaCachePaths.getAudioSegmentPath(mediaId, config as AudioConfig, segmentNumber);
    } else {
      destPath = mediaCachePaths.getSubtitleSegmentPath(mediaId, config as SubtitleConfig, segmentNumber);
    }

    try {
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      logger.debug(`[MediaCacheManager] Stored segment ${segmentNumber} for ${mediaId} at ${destPath}`);
      this.markSegmentComplete(request);
      return destPath;
    } catch (error) {
      logger.error(`[MediaCacheManager] Failed to store segment ${segmentNumber} for ${mediaId}: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a segment is currently being processed
   */
  private isSegmentProcessing(request: SegmentRequest): boolean {
    const key = this.getProcessingKey(request);
    const segments = this.processingSegments.get(key);
    return segments ? segments.has(request.segmentNumber) : false;
  }

  /**
   * Generate a unique key for tracking segment processing
   */
  private getProcessingKey(request: SegmentRequest): string {
    let key = `${request.mediaId}`;

    if ('height' in request.config) {
      const config = request.config as VideoConfig;
      key += `_video_${config.height}p_${config.bitrate}kbps_${config.codec}_${config.streamIndex}`;
    } else if ('bitrate' in request.config && 'channels' in request.config) {
      const config = request.config as AudioConfig;
      key += `_audio_${config.bitrate}kbps_${config.codec}_${config.trackIndex}`;
    } else {
      const config = request.config as SubtitleConfig;
      key += `_subtitle_${config.language}_${config.format}_${config.trackIndex}`;
    }

    return key;
  }

  /**
   * Ensure all cache directories exist for a mediaId
   */
  async ensureCacheDirs(mediaId: string): Promise<void> {
    const mediaDir = mediaCachePaths.getMediaCacheDir(mediaId);

    const dirs = [
      path.join(mediaDir, 'video'),
      path.join(mediaDir, 'audio'),
      path.join(mediaDir, 'subtitles'),
      path.join(mediaDir, 'manifests', 'hls'),
      path.join(mediaDir, 'manifests', 'dash'),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, {recursive: true});
      } catch (error) {
        logger.warn(`[MediaCacheManager] Failed to create directory ${dir}: ${error}`);
      }
    }
  }

  /**
   * Get cached segments for a specific config
   */
  async getCachedSegments(request: Partial<SegmentRequest>): Promise<number[]> {
    try {
      let segmentDir: string;

      if (!request.mediaId || !request.config) {
        throw new Error('mediaId and config are required');
      }

      if ('height' in request.config) {
        segmentDir = mediaCachePaths.getVideoSegmentDir(request.mediaId, request.config as VideoConfig);
      } else if ('bitrate' in request.config && 'channels' in request.config) {
        segmentDir = mediaCachePaths.getAudioSegmentDir(request.mediaId, request.config as AudioConfig);
      } else {
        segmentDir = mediaCachePaths.getSubtitleSegmentDir(request.mediaId, request.config as SubtitleConfig);
      }

      const files = await fs.readdir(segmentDir);
      const segmentPattern = /^seg(\d+)\.\w+$/;

      return files
        .map(file => segmentPattern.exec(file)?.[1])
        .filter(Boolean)
        .map(Number)
        .sort((a, b) => a - b);
    } catch (error) {
      logger.debug(`[MediaCacheManager] Error getting cached segments: ${error}`);
      return [];
    }
  }

  /**
   * Clean up old cache entries
   */
  async cleanupOldCache(mediaId: string, maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const mediaDir = mediaCachePaths.getMediaCacheDir(mediaId);
    const now = Date.now();

    try {
      await this.cleanupDirectory(mediaDir, now - maxAge);
    } catch (error) {
      logger.warn(`[MediaCacheManager] Error during cache cleanup for ${mediaId}: ${error}`);
    }
  }

  /**
   * Helper method to check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Recursively clean up old files
   */
  private async cleanupDirectory(dirPath: string, cutoffTime: number): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, {withFileTypes: true});

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.cleanupDirectory(fullPath, cutoffTime);

          // Remove empty directories
          try {
            const remainingEntries = await fs.readdir(fullPath);
            if (remainingEntries.length === 0) {
              await fs.rmdir(fullPath);
            }
          } catch {
            // Directory might not exist or not be empty, ignore
          }
        } else {
          const stats = await fs.stat(fullPath);
          if (stats.mtimeMs < cutoffTime) {
            await fs.unlink(fullPath);
            logger.debug(`[MediaCacheManager] Cleaned up old cache file: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      // Directory might not exist, ignore
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(mediaId: string): Promise<{
    totalSize: number;
    segmentCount: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    let totalSize = 0;
    let segmentCount = 0;
    let oldestTime: number = Date.now();
    let newestTime: number = 0;

    const mediaDir = mediaCachePaths.getMediaCacheDir(mediaId);

    try {
      await this.processFileStats(mediaDir, (stats, filePath) => {
        if (filePath.includes('seg')) {
          totalSize += stats.size;
          segmentCount++;
          oldestTime = Math.min(oldestTime, stats.mtimeMs);
          newestTime = Math.max(newestTime, stats.mtimeMs);
        }
      });
    } catch (error) {
      logger.debug(`[MediaCacheManager] Error getting cache stats for ${mediaId}: ${error}`);
    }

    return {
      totalSize,
      segmentCount,
      oldestFile: oldestTime !== Date.now() ? new Date(oldestTime) : undefined,
      newestFile: newestTime !== 0 ? new Date(newestTime) : undefined,
    };
  }

  /**
   * Helper to process file statistics recursively
   */
  private async processFileStats(
    dirPath: string,
    callback: (stats: fsSync.Stats, filePath: string) => void,
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, {withFileTypes: true});

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.processFileStats(fullPath, callback);
        } else {
          const stats = await fs.stat(fullPath);
          callback(stats, fullPath);
        }
      }
    } catch {
      // Directory might not exist, ignore
    }
  }
}

// Export singleton instance
export const mediaCacheManager = new MediaCacheManager();