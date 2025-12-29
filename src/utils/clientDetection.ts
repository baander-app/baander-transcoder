/**
 * Client detection utilities for optimal codec selection
 */

export type ClientType = 'browser' | 'mobile' | 'smarttv' | 'native';

export type AudioCodec = 'aac' | 'opus' | 'copy';

export interface ClientInfo {
  type: ClientType;
  userAgent: string;
  preferredCodec: AudioCodec;
  supportsDirectCopy: boolean;
}

/**
 * Analyze User-Agent string to determine client type and preferred audio codec
 */
export function detectClient(userAgent: string): ClientInfo {
  const ua = userAgent.toLowerCase();

  // Mobile browsers
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    return {
      type: 'mobile',
      userAgent,
      preferredCodec: 'aac', // Most mobile browsers prefer AAC for compatibility
      supportsDirectCopy: false
    };
  }

  // Smart TV devices
  if (ua.includes('smart-tv') || ua.includes('tizen') || ua.includes('webos') ||
      ua.includes('roku') || ua.includes('fire tv') || ua.includes('chromecast')) {
    return {
      type: 'smarttv',
      userAgent,
      preferredCodec: 'aac', // Smart TVs typically work best with AAC
      supportsDirectCopy: true
    };
  }

  // Native apps (check for common native app patterns)
  if (ua.includes('nativeapp') || ua.includes('iosapp') || ua.includes('androidapp')) {
    return {
      type: 'native',
      userAgent,
      preferredCodec: 'opus', // Native apps can handle more efficient codecs
      supportsDirectCopy: true
    };
  }

  // Default to web browser
  return {
    type: 'browser',
    userAgent,
    preferredCodec: 'aac', // Hardcoded AAC for web browsers as requested
    supportsDirectCopy: false
  };
}

/**
 * Get the optimal audio codec for a given client
 */
export function getOptimalAudioCodec(
  clientInfo: ClientInfo,
  sourceAudioCodec?: string,
  defaultCodec: AudioCodec = 'aac'
): AudioCodec {
  // If source codec is already supported by client, use direct copy
  if (sourceAudioCodec && clientInfo.supportsDirectCopy && isCodecCompatible(sourceAudioCodec, clientInfo)) {
    return 'copy';
  }

  // Use client's preferred codec
  return clientInfo.preferredCodec || defaultCodec;
}

/**
 * Check if a source audio codec is compatible with the client
 */
function isCodecCompatible(sourceCodec: string, clientInfo: ClientInfo): boolean {
  const codec = sourceCodec.toLowerCase();

  switch (clientInfo.type) {
    case 'browser':
    case 'mobile':
      // Web browsers generally support AAC, some support Opus
      return codec === 'aac' || codec === 'opus';
    case 'smarttv':
      // Smart TVs typically support AAC
      return codec === 'aac';
    case 'native':
      // Native apps can handle multiple formats
      return ['aac', 'opus', 'mp3'].includes(codec);
    default:
      return false;
  }
}

/**
 * Extract client info from Express request
 */
export function getClientInfoFromRequest(req: any): ClientInfo {
  const userAgent = req.get('User-Agent') || '';
  return detectClient(userAgent);
}