import { Property } from '@tsed/schema';
import { FfprobeStream } from './ffprobe-stream';

export class Error {
  @Property()
  code: number;

  @Property()
  string: string;
}

export class Tags {
  @Property()
  compatible_brands: string;

  @Property()
  creation_time: string;

  @Property()
  encoder: string;

  @Property()
  major_brand: string;

  @Property()
  minor_version: string;

  @Property()
  title?: string;

  @Property()
  comment?: string;

  @Property()
  artist?: string;

  @Property()
  genre?: string;

  @Property()
  composer?: string;
}

export class Format {
  @Property()
  bit_rate: string;

  @Property()
  duration: string;

  @Property()
  filename: string;

  @Property()
  format_long_name: string;

  @Property()
  format_name: string;

  @Property()
  nb_programs: number;

  @Property()
  nb_streams: number;

  @Property()
  nb_stream_groups: number;

  @Property()
  probe_score: number;

  @Property()
  size: string;

  @Property()
  start_time: string;

  @Property()
  tags: Tags;

  @Property()
  error?: Error;
}

export class FFProbeReport {
  @Property()
  format: Format;

  @Property({ type: FfprobeStream, isArray: true })
  streams: FfprobeStream[];
}
