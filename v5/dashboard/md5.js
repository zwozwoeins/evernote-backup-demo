'use strict';
/* MD5 fuer Uint8Array (nur zum Pruefen der Evernote-Hashes, keine Sicherheitsfunktion). */
const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const MD5_K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

function md5Pad(bytes) {
  const len = bytes.length;
  const total = (((len + 8) >> 6) + 1) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;
  const bits = len * 8;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, bits >>> 0, true);
  view.setUint32(total - 4, Math.floor(bits / 2 ** 32), true);
  return view;
}

function md5Round(i, b, c, d) {
  if (i < 16) return [(b & c) | (~b & d), i];
  if (i < 32) return [(d & b) | (~d & c), (5 * i + 1) % 16];
  if (i < 48) return [b ^ c ^ d, (3 * i + 5) % 16];
  return [c ^ (b | ~d), (7 * i) % 16];
}

function md5Block(view, off, h) {
  let [a, b, c, d] = h;
  for (let i = 0; i < 64; i += 1) {
    const [f, g] = md5Round(i, b, c, d);
    const sum = (a + f + MD5_K[i] + view.getUint32(off + g * 4, true)) >>> 0;
    a = d; d = c; c = b;
    b = (b + ((sum << MD5_S[i]) | (sum >>> (32 - MD5_S[i])))) >>> 0;
  }
  return [(h[0] + a) >>> 0, (h[1] + b) >>> 0, (h[2] + c) >>> 0, (h[3] + d) >>> 0];
}

function md5Hex(words) {
  return words.map((w) => [0, 8, 16, 24].map((s) => ((w >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
}

function md5(bytes) {
  const view = md5Pad(bytes);
  let h = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let off = 0; off < view.byteLength; off += 64) h = md5Block(view, off, h);
  return md5Hex(h);
}

if (typeof module !== 'undefined') module.exports = { md5 };
