export function convertAacProfile(profile: string) {
  switch (profile) {
    case 'HE':
      return '.40.5';
    case 'LC':
    default:
      return '.40.2';
  }
}
