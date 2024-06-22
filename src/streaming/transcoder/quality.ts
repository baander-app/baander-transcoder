export enum Quality {
  P240 = '240p',
  P360 = '360p',
  P480 = '480p',
  P720 = '720p',
  P1080 = '1080p',
  P1440 = '1440p',
  P4k = '4k',
  P8k = '8k',
  Original = 'original'
}

export const QUALITIES: Quality[] = [
  Quality.P240,
  Quality.P360,
  Quality.P480,
  Quality.P720,
  Quality.P1080,
  Quality.P1440,
  Quality.P4k,
  Quality.P8k,
]

export class VideoQuality {
  static fromString(str: string): Quality {
    if (str === Quality.Original) {
      return Quality.Original;
    }

    if (QUALITIES.includes(str as Quality)) {
      return str as Quality;
    }

    throw new Error(`Invalid quality ${str}`);
  }

  static averageBitrate(v: Quality): number {
    switch (v) {
      case Quality.P240:
        return 400_000;
      case Quality.P360:
        return 800_000;
      case Quality.P480:
        return 1_200_000;
      case Quality.P720:
        return 2_400_000;
      case Quality.P1080:
        return 4_800_000;
      case Quality.P1440:
        return 9_600_000;
      case Quality.P4k:
        return 16_000_000;
      case Quality.P8k:
        return 28_000_000;
      case Quality.Original:
        throw new Error('Original quality must be handled specially');
    }
  }

  static maxBitrate(v: Quality): number {
    switch (v) {
      case Quality.P240:
        return 700_000;
      case Quality.P360:
        return 1_400_000;
      case Quality.P480:
        return 2_100_000;
      case Quality.P720:
        return 4_000_000;
      case Quality.P1080:
        return 8_000_000;
      case Quality.P1440:
        return 12_000_000;
      case Quality.P4k:
        return 28_000_000;
      case Quality.P8k:
        return 40_000_000;
      case Quality.Original:
        throw new Error('Original quality must be handled specially');
    }
  }

  static height(q: Quality): number {
    switch (q) {
      case Quality.P240:
        return 240;
      case Quality.P360:
        return 360;
      case Quality.P480:
        return 480;
      case Quality.P720:
        return 720;
      case Quality.P1080:
        return 1080;
      case Quality.P1440:
        return 1440;
      case Quality.P4k:
        return 2160;
      case Quality.P8k:
        return 4320;
      case Quality.Original:
        throw new Error('Original quality must be handled specially');
    }
  }

  static fromHeight(height: number): Quality {
    for (const quality of QUALITIES) {
      if (height <= this.height(quality)) {
        return quality;
      }
    }

    return Quality.P240;
  }
}