// Reads tools/cs/push-cases.json and turns each row into the text that is sent. Used by
// verify-cs.mjs (the compiled C#) and by verify.mjs (the mock's mirror of it), so that
// both run the very same rows. Nothing here decides what is accepted: that is the
// "expect" of each row, and the two runs are checked against it.
//
//   const table = loadPushCases(TIMBRE);
//   table.cases          [{ name, where: 'push' | 'cache', text, expect, gap }]
//   table.errors         { code: message }, as the action broadcasts them
//   table.requiredKeys   the top-level keys of TIMBRE.defaultConfig(), in its order
//   table.full           a full config as today's dock sends it (text)
//   table.trim(text)     the text without JSON white space at its ends
//   table.wire(text)     the timbre:config broadcast for a stored text
//   table.errorWire(c)   the timbre:error broadcast for a code

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export function loadPushCases(T) {
  const table = JSON.parse(readFileSync(join(HERE, 'push-cases.json'), 'utf8'));
  const fullObject = () => T.sanitizeConfig(T.defaultConfig());
  const requiredKeys = Object.keys(T.defaultConfig());

  // Take a dotted path out of an object. A path that is not there is a row gone stale.
  const drop = (obj, path, name) => {
    const parts = path.split('.');
    let o = obj;
    for (const p of parts.slice(0, -1)) {
      if (!o || typeof o !== 'object' || !Object.prototype.hasOwnProperty.call(o, p)) throw new Error(`push-cases.json, "${name}": there is no ${path} in a full config`);
      o = o[p];
    }
    const last = parts[parts.length - 1];
    if (!o || typeof o !== 'object' || !Object.prototype.hasOwnProperty.call(o, last)) throw new Error(`push-cases.json, "${name}": there is no ${path} in a full config`);
    delete o[last];
  };

  const textOf = (row) => {
    if (typeof row.text === 'string') return row.text;
    if (Array.isArray(row.repeat)) return String(row.repeat[0]).repeat(row.repeat[1]);
    if (!row.full || typeof row.full !== 'object') throw new Error(`push-cases.json, "${row.name}": a row needs text, full or repeat`);
    const f = row.full;
    const obj = fullObject();
    for (const path of f.drop || []) drop(obj, path, row.name);
    Object.assign(obj, f.set || {});
    if (f.size != null) {
      obj.pad = '';
      const room = f.size - JSON.stringify(obj).length;
      if (room < 0) throw new Error(`push-cases.json, "${row.name}": a full config is already longer than ${f.size}`);
      obj.pad = 'x'.repeat(room);
    }
    let text = f.pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    if (f.swap) {
      if (!text.includes(f.swap[0])) throw new Error(`push-cases.json, "${row.name}": a full config has no ${f.swap[0]}`);
      text = text.replace(f.swap[0], () => f.swap[1]);
    }
    return ' '.repeat(f.padBefore || 0) + (f.before || '') + text + (f.after || '');
  };

  const cases = table.cases.map((row) => ({ name: row.name, where: row.where === 'cache' ? 'cache' : 'push', text: textOf(row), expect: row.expect, gap: row.gap === true }));
  // One row for each top-level key: without it, a config is not a full config.
  for (const key of requiredKeys) {
    const obj = fullObject();
    delete obj[key];
    cases.push({ name: `a full config without "${key}"`, where: 'push', text: JSON.stringify(obj), expect: 'partial-config', gap: false });
  }

  return {
    cases,
    errors: table.errors,
    maxChars: table.maxChars,
    requiredKeys,
    full: JSON.stringify(fullObject()),
    trim: (text) => text.replace(/^[ \t\n\r]+|[ \t\n\r]+$/g, ''),
    wire: (text) => '{"type":"timbre:config","config":' + text + '}',
    errorWire: (code) => JSON.stringify({ type: 'timbre:error', code, message: table.errors[code] }),
  };
}
