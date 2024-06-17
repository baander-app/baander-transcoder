import { BadRequest } from '@tsed/exceptions';

export class FileDoesNotExistException extends BadRequest {
  constructor(filePath: string) {
    super(`File does not exist: ${filePath}`);
  }
}