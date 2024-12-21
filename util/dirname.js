import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export function __dirname(url) {
  return dirname(fileURLToPath(url));
}

export default __dirname;
