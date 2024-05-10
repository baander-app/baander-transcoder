export class HlsPlaylist {
  private segments: { uri: string, duration: number }[] = [];

  constructor(
    public version: number,
    public targetDuration: number,
    public mediaSequence: number,
  ) {
  }

  addSegment(uri: string, duration: number) {
    this.segments.push({ uri, duration });
  }

  toString() {
    return `#EXTM3U
#EXT-X-VERSION:${this.version}
#EXT-X-TARGETDURATION:${this.targetDuration}
#EXT-X-MEDIA-SEQUENCE:${this.mediaSequence}
#EXT-X-PLAYLIST-TYPE:VOD
    
${this.segments.map(segment => `#EXTINF:${segment.duration.toFixed(6)},\n${segment.uri}`).join('\n')}
    
#EXT-X-ENDLIST
`
  }
}