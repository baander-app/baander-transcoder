import path from 'node:path';
import { MEDIA_REPORTS_DIR } from '../../../config/envs';
import { sha256 } from '../../../utils';

export function getMediaReportPath(mediaFilePath: string) {
  return path.join(MEDIA_REPORTS_DIR, sha256(mediaFilePath), '.json');
}