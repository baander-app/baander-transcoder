import { orderBy } from 'lodash';
import { getVideoInfo } from './ffmpeg';
import { filenameLooksLikeVideo } from '../utils/file';
import { ci } from '../state';
import { Entry } from '../indexing';

export interface LibraryContent {
  item: any;
  children: any[];
  parents: any[];
}

export class LibraryService {
  async getContent(pathParam: string): Promise<LibraryContent> {
    const p = pathParam || '';
    let item: Entry;
    if (p === '') {
      item = { id: '', name: 'Home', isDir: true, path: '', parentId: '' };
    } else {
      const found = await ci.get(p);
      if (!found) throw new Error('Not found');
      item = found;
    }

    const entries = await ci.list(item.id);
    const children = orderBy(entries.filter(e => e.isDir || filenameLooksLikeVideo(e.name)), 'name');
    
    const itemChildren = [];
    for (const e of children) {
      const info = e.isDir ? null : await getVideoInfo(e.path).catch(() => null);
      if (info || e.isDir) {
        itemChildren.push({
          id: e.id,
          type: e.isDir ? 'folder' : 'video',
          name: e.name,
          path: e.id,
          info
        });
      }
    }

    const parents = await this.getParents(item);
    const { prev, next } = this.getPrevNext(item.id, entries);

    return {
      item: {
        id: item.id,
        type: item.isDir ? 'folder' : 'video',
        name: item.name,
        path: item.id,
        info: item.isDir ? null : await getVideoInfo(item.path).catch(() => null),
        prev,
        next
      },
      children: itemChildren,
      parents
    };
  }

  private async getParents(item: Entry) {
    let parents: any[] = [];
    let curr = item;
    while (curr.parentId !== '') {
      const parent = await ci.get(curr.parentId);
      if (!parent) break;
      parents.unshift({
        id: parent.id,
        type: parent.isDir ? 'folder' : 'video',
        name: parent.name,
        path: parent.id,
        info: null
      });
      curr = parent;
    }
    parents.unshift({ id: '', type: 'folder', name: 'Home', path: '', info: null });
    return parents;
  }

  private getPrevNext(id: string, entries: Entry[]) {
    let prev = '';
    let next = '';
    let found = false;
    for (const e of orderBy(entries, 'name')) {
      if (found) {
        if (!e.isDir && filenameLooksLikeVideo(e.name)) {
          next = e.id;
          break;
        }
      }
      if (e.id === id) {
        found = true;
      } else if (!found && !e.isDir && filenameLooksLikeVideo(e.name)) {
        prev = e.id;
      }
    }
    return { prev, next };
  }

  async getAllEntries(): Promise<Entry[]> {
    return ci.getAll();
  }
}

export const libraryService = new LibraryService();
