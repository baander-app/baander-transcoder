import { Inject, OnDestroy, OnInit, Service } from '@tsed/di';
import { Session } from './session';
import { $log } from '@tsed/common';
import { Transcoder } from './transcoder';
import { Quality } from './quality';
import { DeletedHead, Stream } from './stream';

@Service()
export class SessionManager implements  OnInit, OnDestroy {
  @Inject()
  private transcoder: Transcoder;

  private _sessions: Map<string, Session> = new Map();
  private _visitTime: Map<string, number> = new Map();
  private _lastUsage: Map<string, number> = new Map();
  private _deletedStream: string[] = [];
  private _timerId: NodeJS.Timeout;


  $onInit(): Promise<any> | void {
    const inactiveTime = 1000 * 60 * 60; // 1 hour
    this._timerId = setInterval(() => this.purgeInactiveClients(), inactiveTime);
  }

  $onDestroy(): Promise<any> | void {
    clearInterval(this._timerId);
  }

  purgeInactiveClients() {
    const consideredInactive = Date.now() - 1000 * 60 * 60; // 1 hour

    for (const [clientId, lastUsage] of this._lastUsage) {
      if (lastUsage < consideredInactive) {
        this._sessions.delete(clientId);
        this._visitTime.delete(clientId);
        this._lastUsage.delete(clientId);
      }
    }
  }

  async killStreamIfUnwatched(path: string) {
    for (const [clientId, session] of this._sessions) {
      if (session.path === path) {
        return;
      }

      $log.info(`Killing stream for ${clientId}`);
      const stream = this.transcoder.getStream(clientId);

      await stream?.kill()
    }
  }


  private async killAudioIfDead(path: string, audio: number) {
    for (const [clientId, session] of this._sessions.entries()) {
      if (session.path === path && session.audioIndex === audio) {
        return;
      }

      console.log(`Killing audio ${audio} for ${clientId}`);
      const stream = this.transcoder.streams.get(clientId);

      if (stream) {
        const audioStream = await stream.audioStream(audio);

        if (audioStream) {
          audioStream.kill();
        }
      }
    }
  }

  private async killQualityIfDead(path: string, quality: Quality) {
    for (const [clientId, session] of this._sessions.entries()) {
      if (session.path === path && session.quality === quality) {
        return;
      }

      console.log(`Killing quality ${quality} for ${clientId}`);
      const stream = this.transcoder.streams.get(clientId);

      if (stream) {
        const videoStream = await stream.videoStream(quality);

        if (videoStream) {
          videoStream.kill();
        }
      }
    }
  }

  private async killOrphanedHeads(path: string, quality: Quality | null, audio: number) {
    const stream = this.transcoder.streams.get(path);

    if (!stream) {
      return;
    }

    if (quality !== null) {
      const videoStream = await stream.videoStream(quality);

      if (videoStream) {
        this.killOrphanedeheads(videoStream);
      }
    }

    if (audio !== -1) {
      const audioStream = await stream.audioStream(audio);

      if (audioStream) {
        this.killOrphanedeheads(audioStream);
      }
    }
  }

  private killOrphanedeheads(stream: Stream) {
    for (const [encoderId, head] of stream.heads.entries()) {
      if (head === DeletedHead) {
        continue;
      }

      let distance = 99999;
      for (const [, info] of this._sessions.entries()) {
        if (info.head === -1) {
          continue;
        }
        distance = Math.min(Math.abs(info.head - head.segment), distance);
      }
      if (distance > 20) {
        console.log(`Killing orphaned stream ${stream.file.mediaReport.mediaPath} ${encoderId}`);
        stream.killHead(encoderId);
      }
    }
  }
}