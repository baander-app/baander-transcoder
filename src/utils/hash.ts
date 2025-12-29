import * as crypto from 'crypto';
import { BinaryLike } from 'crypto';

export const sha256 = (data: BinaryLike, encoding = 'hex') => {
  return crypto.createHash('sha256').update(data).digest('hex');
};