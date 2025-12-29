import { ci, homeDir } from '../state';
import { filenameLooksLikeCaption } from '../utils/file';
import * as path from 'path';
import { sha256 } from '../utils/hash';

let metadataPath = 'trickplay';

export function setMetadataPath(p: string) {
  metadataPath = p;
}

export class MediaService {
  async getEntry(pathParam: string) {
    const entry = await ci.get(pathParam);
    if (!entry) throw new Error('Not found');
    return entry;
  }

  async getCaptions(entry: any, protocol: string, host: string) {
    const parentEntries = await ci.list(entry.parentId);
    return parentEntries
      .filter(e => !e.isDir && filenameLooksLikeCaption(e.name))
      .map(e => `${protocol}://${host}/api/captions/${e.id}`);
  }

  getTrickplayDir(entry: any) {
    const hash = sha256(entry.path);
    return path.join(homeDir, metadataPath, hash);
  }
}

export const mediaService = new MediaService();
