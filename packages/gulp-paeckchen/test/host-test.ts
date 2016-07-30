import test from 'ava';
import { File } from 'gulp-util';

import { GulpHost } from '../src/host';

test('GulpHost should return previously added files', t => {
  const host = new GulpHost();
  const file = new File({
    path: '/test'
  });

  host.addFile(file);
  t.is(host.getFile(file.path), file);
});
