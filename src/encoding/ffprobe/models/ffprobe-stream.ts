import { Property } from '@tsed/schema';

export class Disposition {
  @Property()
  attached_pic: number;

  @Property()
  clean_effects: number;

  @Property()
  comment: number;

  @Property()
  default: number;

  @Property()
  dub: number;

  @Property()
  forced: number;

  @Property()
  hearing_impaired: number;

  @Property()
  karaoke: number;

  @Property()
  lyrics: number;

  @Property()
  original: number;

  @Property()
  timed_thumbnails: number;

  @Property()
  visual_impaired: number;
}

export class Tags {
  @Property()
  creation_time: string;

  @Property()
  handler_name: string;

  @Property()
  language: string;

  @Property()
  rotate: string;
}

export class FfprobeStream {
  @Property()
  avg_frame_rate: string;

  @Property()
  bit_rate: string;

  @Property()
  bits_per_raw_sample?: string;

  @Property()
  chroma_location?: string;

  @Property()
  codec_long_name: string;

  @Property()
  codec_name: string;

  @Property()
  codec_tag: string;

  @Property()
  codec_tag_string: string;

  @Property()
  codec_time_base: string;

  @Property()
  codec_type: string;

  @Property()
  coded_height?: number;

  @Property()
  coded_width?: number;

  @Property()
  display_aspect_ratio?: string;

  @Property()
  disposition: Disposition;

  @Property()
  duration: string;

  @Property()
  duration_ts: number;

  @Property()
  has_b_frames?: number;

  @Property()
  height: number;

  @Property()
  index: number;

  @Property()
  is_avc: string;

  @Property()
  level: number;

  @Property()
  nal_length_size: string;

  @Property()
  nb_frames: string;

  @Property()
  nb_read_frames: string;

  @Property()
  pix_fmt?: string;

  @Property()
  profile: string;

  @Property()
  r_frame_rate: string;

  @Property()
  refs: number;

  @Property()
  sample_aspect_ratio: string;

  @Property()
  start_pts: string;

  @Property()
  start_time: string;

  @Property()
  tags: Tags;

  @Property()
  time_base: string;

  @Property()
  width?: number;

  @Property()
  bits_per_sample?: number;

  @Property()
  channel_layout?: string;

  @Property()
  channels?: number;

  @Property()
  max_bit_rate?: string;

  @Property()
  sample_fmt?: string;

  @Property()
  sample_rate?: string;
}

