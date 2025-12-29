import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { libraryRouter } from '../../src/controllers/library';
import { libraryService } from '../../src/services/library';

vi.mock('../../src/services/library');
vi.mock('../../src/services/logger');

const app = express();
app.use('/api', libraryRouter);

describe('Library Controller', () => {
  it('should return content for valid path', async () => {
    const mockContent = { item: { id: '1', name: 'Test' }, children: [], parents: [] };
    (libraryService.getContent as any).mockResolvedValue(mockContent);

    const res = await request(app).get('/api/item/some/path');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockContent);
    expect(libraryService.getContent).toHaveBeenCalledWith('some/path');
  });

  it('should return 404 if item not found', async () => {
    (libraryService.getContent as any).mockRejectedValue(new Error('Not found'));

    const res = await request(app).get('/api/item/invalid');
    expect(res.status).toBe(404);
  });

  it('should return 500 for other errors', async () => {
    (libraryService.getContent as any).mockRejectedValue(new Error('Database error'));

    const res = await request(app).get('/api/item/error');
    expect(res.status).toBe(500);
  });

  it('should return all entries', async () => {
    const mockEntries = [{ id: '1', name: 'Video 1' }, { id: '2', name: 'Video 2' }];
    (libraryService.getAllEntries as any).mockResolvedValue(mockEntries);

    const res = await request(app).get('/api/library');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockEntries);
    expect(libraryService.getAllEntries).toHaveBeenCalled();
  });

  it('should return 500 if getAllEntries fails', async () => {
    (libraryService.getAllEntries as any).mockRejectedValue(new Error('Index error'));

    const res = await request(app).get('/api/library');
    expect(res.status).toBe(500);
  });
});
