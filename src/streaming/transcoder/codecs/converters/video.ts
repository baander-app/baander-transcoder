export function convertH264Profile(profile: string) {
  switch (profile) {
    case 'high':
      return '.6400';
    case 'main':
      return '.4D40';
    case 'baseline':
    default:
      return '.42E0';
  }
}

export function convertAv1Profile(profile: string) {
  switch (profile) {
    case 'high':
      return '.1';
    case 'professional':
      return '.2';
    case 'main':
    default:
      return '0';
  }
}