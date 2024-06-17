export interface Probe {
  streams: Stream[]
  format: Format
}

export interface Stream {
  index: number
  codec_name: string
  codec_long_name: string
  profile?: string
  codec_type: string
  codec_tag_string: string
  codec_tag: string
  width?: number
  height?: number
  coded_width?: number
  coded_height?: number
  closed_captions?: number
  film_grain?: number
  has_b_frames?: number
  sample_aspect_ratio?: string
  display_aspect_ratio?: string
  pix_fmt?: string
  level?: number
  color_range?: string
  color_space?: string
  color_transfer?: string
  color_primaries?: string
  chroma_location?: string
  field_order?: string
  refs?: number
  r_frame_rate: string
  avg_frame_rate: string
  time_base: string
  start_pts: number
  start_time: string
  extradata_size?: number
  disposition: Disposition
  tags?: {
    [key: string]: string
  };
  sample_fmt?: string
  sample_rate?: string
  channels?: number
  channel_layout?: string
  bits_per_sample?: number
  initial_padding?: number
  duration_ts?: number
  duration?: string
}

export interface Disposition {
  default: number
  dub: number
  original: number
  comment: number
  lyrics: number
  karaoke: number
  forced: number
  hearing_impaired: number
  visual_impaired: number
  clean_effects: number
  attached_pic: number
  timed_thumbnails: number
  non_diegetic: number
  captions: number
  descriptions: number
  metadata: number
  dependent: number
  still_image: number
}

export interface Format {
  filename: string
  nb_streams: number
  nb_programs: number
  nb_stream_groups: number
  format_name: string
  format_long_name: string
  start_time: string
  duration: string
  size: string
  bit_rate: string
  probe_score: number
  tags?: {
    [key: string]: string
  };
}