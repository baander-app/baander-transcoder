const videoSuffixes = ['.mp4', '.rmvb', '.avi', '.mkv', '.flv', '.wmv', '.mov', '.mpg'];

export function filenameLooksLikeVideo(name: string): boolean {
  return videoSuffixes.some(suf => name.toLowerCase().endsWith(suf));
}

const captionSuffixes = ['.srt', '.vtt'];

export function filenameLooksLikeCaption(name: string): boolean {
  return captionSuffixes.some(suf => name.toLowerCase().endsWith(suf));
}
