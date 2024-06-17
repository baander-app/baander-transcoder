import { isAudioStreamProbe } from './types';
import { Stream } from './models';

export function getProfileAndLevel(probe: Stream) {
  if (!isAudioStreamProbe(probe)) {
    return {
      profile: 'unknown',
      level: 0
    };
  }

  const profileLevel = probe.profile!.split(' ');
  return {
    profile: profileLevel[0].toLowerCase(),
    // may try parse int instead who knows
    level: Number.parseFloat(profileLevel[1])
  };
}