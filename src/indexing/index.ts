// src/fileindex.ts
import * as fs from 'fs/promises';
import * as fssync from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { orderBy } from 'lodash';
import { logger } from '../services/logger';
import { sha256 } from '../utils/hash';

export interface Entry {
  id: string;
  name: string;
  isDir: boolean;
  path: string;
  parentId: string;
}

export interface Index {
  id: string;
  name: string;
  root: string;

  get(id: string): Promise<Entry | null>;

  list(parent: string): Promise<Entry[]>;

  getAll(): Promise<Entry[]>;
}

type Filter = (name: string, isDir: boolean) => boolean; // true to include

const hiddenFilter: Filter = (name) => !name.startsWith('.');

class MemEntry implements Entry {
  constructor(
    public id: string,
    public name: string,
    public isDir: boolean,
    public path: string,
    public parentId: string,
  ) {
  }
}

function entryId(name: string, entryPath: string, stat: fssync.Stats): string {
  return sha256(`${name}\n${entryPath}\n${stat.size}\n${stat.mtimeMs}\n${stat.isDirectory()}`);
}

export class MemIndex implements Index {
  private data: Map<string, Entry> = new Map();
  private children: Map<string, Entry[]> = new Map();
  private watcher: chokidar.FSWatcher | null = null;

  constructor(
    public id: string,
    public name: string,
    public root: string,
    scanInterval: number,
    private filter: Filter = () => true,
  ) {
    logger.info(`Initializing MemIndex for ${name} at ${root} with interval ${scanInterval}s`);
    this.scan();
    this.watcher = chokidar.watch(this.root, {persistent: true, ignoreInitial: true});
    this.watcher.on('all', () => {
      logger.debug(`File change detected in ${this.root}, rescanning...`);
      this.scan();
    });
    setInterval(() => {
      logger.debug(`Scheduled rescan for ${this.root}`);
      this.scan();
    }, scanInterval * 1000);
  }

  private async scan() {
    try {
      logger.debug(`Starting scan for ${this.name} (${this.root})`);
      this.data.clear();
      this.children.clear();
      await this.updateDir(this.root, '', '');
      logger.info(`Scan completed for ${this.name} (${this.root}). Total entries: ${this.data.size}`);
    } catch (error) {
      logger.error(`Error scanning ${this.name} (${this.root}):`, error);
    }
  }

  private async updateDir(dirPath: string, relPath: string, parentId: string) {
    try {
      const stat = await fs.stat(dirPath);
      const entry = new MemEntry(
        entryId(path.basename(dirPath), relPath, stat),
        path.basename(dirPath),
        true,
        dirPath,
        parentId,
      );
      this.data.set(entry.id, entry);
      this.addChild(parentId, entry);

      const files = await fs.readdir(dirPath, {withFileTypes: true});
      for (const file of files) {
        if (!this.filter(file.name, file.isDirectory())) continue;
        const fullPath = path.join(dirPath, file.name);
        try {
          const fileStat = await fs.stat(fullPath);
          const childRel = path.join(relPath, file.name);
          const childEntry = new MemEntry(
            entryId(file.name, childRel, fileStat),
            file.name,
            file.isDirectory(),
            fullPath,
            entry.id,
          );
          this.data.set(childEntry.id, childEntry);
          this.addChild(entry.id, childEntry);
          if (file.isDirectory()) {
            await this.updateDir(fullPath, childRel, entry.id);
          }
        } catch (fileErr) {
          logger.warn(`Failed to stat file ${fullPath}:`, fileErr);
        }
      }
    } catch (err) {
      logger.error(`Failed to update directory ${dirPath}:`, err);
      throw err; // Re-throw to be caught by scan()
    }
  }

  private addChild(parentId: string, entry: Entry) {
    if (!this.children.has(parentId)) this.children.set(parentId, []);
    this.children.get(parentId)!.push(entry);
  }

  async get(id: string): Promise<Entry | null> {
    return this.data.get(id) || null;
  }

  async list(parent: string): Promise<Entry[]> {
    return orderBy(this.children.get(parent) || [], 'name');
  }

  async getAll(): Promise<Entry[]> {
    return Array.from(this.data.values());
  }
}

export class CompoundIndex implements Index {
  private indexes: Map<string, Index> = new Map();

  constructor(
    public id: string,
    public name: string,
    ...indexes: Index[]
  ) {
    indexes.forEach(idx => this.indexes.set(idx.id, idx));
  }

  get root(): string {
    return '**compound**';
  }

  async get(id: string): Promise<Entry | null> {
    if (id === '') return null;
    if (this.indexes.has(id)) {
      const idx = this.indexes.get(id)!;
      return new MemEntry(idx.id, idx.name, true, '', '');
    }
    for (const idx of this.indexes.values()) {
      const entry = await idx.get(id);
      if (entry) {
        return entry.parentId === '' ? {...entry, parentId: idx.id} : entry;
      }
    }
    return null;
  }

  async list(parent: string): Promise<Entry[]> {
    if (parent === '') {
      return Array.from(this.indexes.values()).map(idx => new MemEntry(idx.id, idx.name, true, '', ''));
    }
    let idx = this.indexes.get(parent);
    let adjustedParent = parent;
    if (idx) adjustedParent = '';
    if (!idx) {
      for (const i of this.indexes.values()) {
        const e = await i.get(parent);
        if (e) {
          idx = i;
          break;
        }
      }
    }
    if (!idx) return [];
    let list = await idx.list(adjustedParent);
    list = list.map(e => e.parentId === '' ? {...e, parentId: idx!.id} : e);
    return orderBy(list, 'name');
  }

  async getAll(): Promise<Entry[]> {
    const all = await Promise.all(Array.from(this.indexes.values()).map(idx => idx.getAll()));
    // Flatten and adjust parentIds for root items if necessary (though getAll usually returns raw entries)
    // For CompoundIndex, we might want to ensure uniqueness or path handling, but for now simple flat list:
    return all.flat();
  }
}
