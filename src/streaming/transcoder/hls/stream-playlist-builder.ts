export interface StreamOptions {
  type: 'audio' | 'video';
  keyFrames: number[];
  duration: number;
}

export function streamPlaylistBuilder({ type, keyFrames, duration }: StreamOptions): string {
  let index: string = `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-PLAYLIST-TYPE:EVENT
#EXT-X-START:TIME-OFFSET=0
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-INDEPENDENT-SEGMENTS
`;

  const length = keyFrames.length;

  for (let segment = 0; segment < length - 1; segment++) {
    index += `#EXTINF:${(this.file.mediaReport.keyFrames[segment + 1] - keyFrames[segment]).toFixed(6)}\n`;
    index += `segment-${segment}.ts\n`;
  }

  index += `#EXTINF:${(duration - keyFrames[length - 1]).toFixed(6)}\n`;
  index += `segment-${length - 1}.${type === 'audio' ? 'm4a' : 'ts'}\n`;
  index += `#EXT-X-ENDLIST`;

  return index;
}