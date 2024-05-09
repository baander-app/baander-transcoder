import { Transcode } from './transcode';
import { Segment } from './segment';
import { FFProbeReport } from './ffprobe/models/format';
import * as process from 'node:process';


export class Stream {
  id: number;
  segments: Segment[] = [];
  segmentLength: number;
  lastAccess: number = Date.now();
  transcode: Transcode | null = null;
  hash: string;
  lastSegmentTime: number;
  lastSegmentIndex: number;
  outputDir: string;

  private _path: string;

  private _lastSegmentTime: number;
  private _lastSegmentIndex: number;
  private _profile: string[];
  private _probeReport: FFProbeReport;


  constructor(
    path: string,
    profile: string[],
    probeReport: FFProbeReport,
    outputDir: string,
    segmentLength: number = 6,
  )  {
    this._path = path;
    this.segmentLength = segmentLength;
    this._profile = profile;
    this._probeReport = probeReport;
    this.outputDir = outputDir;
  }

  lastSegment() {
    return Number(Math.ceil(Number(this._probeReport.format.duration) / this.segmentLength).toFixed(0)) - 1;
  }

  makeArgs(segment: number) {
    const profile = this._profile.slice()

    profile.splice(0 ,0,'-i', this._path);

    if (segment > 0) {
      profile.push('-ss', `${segment * this.segmentLength}`);
    }

    return profile;
  }
}