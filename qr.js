// Small QR encoder (byte mode, error correction M, versions 1–10). No runtime dependency.
const QR_EXP = new Uint8Array(512), QR_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    QR_EXP[i] = x;
    QR_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) QR_EXP[i] = QR_EXP[i - 255];
})();
function qrMul(a, b) {
  if (!a || !b) return 0;
  return QR_EXP[QR_LOG[a] + QR_LOG[b]];
}
function qrGenerator(nsym) {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const ng = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      ng[j] ^= g[j];
      ng[j + 1] ^= qrMul(g[j], QR_EXP[i]);
    }
    g = ng;
  }
  return g;
}
function qrRemainder(data, nsym) {
  const gen = qrGenerator(nsym);
  const out = new Uint8Array(data.length + nsym);
  out.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = out[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j++) out[i + j] ^= qrMul(gen[j], coef);
  }
  return out.slice(data.length);
}
// ec = error-correction codewords per block; b = [count, data codewords] groups; rem = remainder bits; align = centers
const QR_SPEC = {
  1: { ec: 10, b: [[1, 16]], rem: 0, align: [] },
  2: { ec: 16, b: [[1, 28]], rem: 7, align: [6, 18] },
  3: { ec: 26, b: [[1, 44]], rem: 7, align: [6, 22] },
  4: { ec: 18, b: [[2, 32]], rem: 7, align: [6, 26] },
  5: { ec: 24, b: [[2, 43]], rem: 7, align: [6, 30] },
  6: { ec: 16, b: [[4, 27]], rem: 7, align: [6, 34] },
  7: { ec: 18, b: [[4, 31]], rem: 0, align: [6, 22, 38] },
  8: { ec: 22, b: [[2, 38], [2, 39]], rem: 0, align: [6, 24, 42] },
  9: { ec: 22, b: [[3, 36], [2, 37]], rem: 0, align: [6, 26, 46] },
  10: { ec: 26, b: [[4, 43], [1, 44]], rem: 0, align: [6, 28, 50] }
};
function qrDataLen(spec) { return spec.b.reduce((s, g) => s + g[0] * g[1], 0); }
function qrFits(version, bytes) {
  const cc = version < 10 ? 8 : 16;
  return 4 + cc + bytes * 8 <= qrDataLen(QR_SPEC[version]) * 8;
}
function qrEncodeBytes(bytes, version) {
  const spec = QR_SPEC[version];
  const cap = qrDataLen(spec) * 8;
  const cc = version < 10 ? 8 : 16;
  const bits = [];
  const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, cc);
  for (const b of bytes) push(b, 8);
  const term = Math.min(4, cap - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const pad = [0xec, 0x11];
  let pi = 0;
  while (bits.length < cap) { push(pad[pi], 8); pi ^= 1; }
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  const blocks = [];
  let o = 0;
  for (const [count, len] of spec.b) {
    for (let i = 0; i < count; i++) {
      const d = data.slice(o, o + len);
      o += len;
      blocks.push({ d, ecc: qrRemainder(d, spec.ec) });
    }
  }
  const maxD = Math.max(...blocks.map(b => b.d.length));
  const out = [];
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < spec.ec; i++) for (const b of blocks) out.push(b.ecc[i]);
  const bitOut = [];
  for (const cw of out) for (let i = 7; i >= 0; i--) bitOut.push((cw >> i) & 1);
  for (let i = 0; i < spec.rem; i++) bitOut.push(0);
  return bitOut;
}
function qrFormatBits(mask) {
  let rem = mask << 10;
  for (let i = 4; i >= 0; i--) if (rem & (1 << (i + 10))) rem ^= 0x537 << i;
  return ((mask << 10) | (rem & 0x3ff)) ^ 0x5412;
}
function qrVersionBits(ver) {
  let rem = ver << 12;
  for (let i = 5; i >= 0; i--) if (rem & (1 << (i + 12))) rem ^= 0x1f25 << i;
  return (ver << 12) | (rem & 0xfff);
}
function qrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  let version = 1;
  while (version < 10 && !qrFits(version, bytes.length)) version++;
  if (!qrFits(version, bytes.length)) throw new Error('Invite link is too long for a QR code');
  const spec = QR_SPEC[version];
  const n = 21 + 4 * (version - 1);
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  const res = Array.from({ length: n }, () => Array(n).fill(0));
  const mark = (r, c, dark) => { m[r][c] = dark ? 1 : 0; res[r][c] = 1; };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      mark(rr, cc, on);
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 0; i < n; i++) {
    if (!res[6][i]) mark(6, i, i % 2 === 0);
    if (!res[i][6]) mark(i, 6, i % 2 === 0);
  }
  const pos = spec.align;
  for (const r of pos) for (const c of pos) {
    if ((r === 6 && (c === 6 || c === pos[pos.length - 1])) || (c === 6 && r === pos[pos.length - 1])) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) mark(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }
  mark(n - 8, 8, 1);
  for (let i = 0; i < 9; i++) { res[8][i] = 1; res[i][8] = 1; }
  for (let i = 0; i < 8; i++) { res[8][n - 1 - i] = 1; res[n - 1 - i][8] = 1; }
  if (version >= 7) {
    const vb = qrVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = (vb >> i) & 1, a = Math.floor(i / 3), b = i % 3;
      mark(a, n - 11 + b, bit);
      mark(n - 11 + b, a, bit);
    }
  }
  const bits = qrEncodeBytes(bytes, version);
  let idx = 0, dir = -1, row = n - 1, col = n - 1;
  while (col > 0) {
    if (col === 6) col--;
    for (;;) {
      for (let k = 0; k < 2; k++) {
        const cc = col - k;
        if (!res[row][cc]) m[row][cc] = idx < bits.length ? bits[idx++] : 0;
      }
      const nr = row + dir;
      if (nr < 0 || nr >= n) { dir = -dir; col -= 2; break; }
      row = nr;
    }
  }
  let best = null, bestScore = Infinity, bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    const o = m.map(r => r.slice());
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (res[r][c]) continue;
      let flip = false;
      if (mask === 0) flip = (r + c) % 2 === 0;
      else if (mask === 1) flip = r % 2 === 0;
      else if (mask === 2) flip = c % 3 === 0;
      else if (mask === 3) flip = (r + c) % 3 === 0;
      else if (mask === 4) flip = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      else if (mask === 5) flip = ((r * c) % 2 + (r * c) % 3) === 0;
      else if (mask === 6) flip = ((r * c) % 2 + (r * c) % 3) % 2 === 0;
      else flip = ((r + c) % 2 + (r * c) % 3) % 2 === 0;
      if (flip) o[r][c] ^= 1;
    }
    const fmt = qrFormatBits(mask);
    for (let i = 0; i < 15; i++) {
      const bit = (fmt >> i) & 1;
      if (i < 6) o[i][8] = bit;
      else if (i < 8) o[i + 1][8] = bit;
      else o[n - 15 + i][8] = bit;
      if (i < 8) o[8][n - 1 - i] = bit;
      else if (i < 9) o[8][15 - i] = bit;
      else o[8][14 - i] = bit;
    }
    const score = qrPenalty(o);
    if (score < bestScore) { bestScore = score; best = o; bestMask = mask; }
  }
  best.mask = bestMask;
  return best;
}
function qrPenalty(m) {
  const n = m.length;
  let score = 0;
  const run = (get) => {
    for (let i = 0; i < n; i++) {
      let cnt = 1;
      for (let j = 1; j < n; j++) {
        if (get(i, j) === get(i, j - 1)) cnt++;
        else { if (cnt >= 5) score += 3 + (cnt - 5); cnt = 1; }
      }
      if (cnt >= 5) score += 3 + (cnt - 5);
    }
  };
  run((i, j) => m[i][j]);
  run((i, j) => m[j][i]);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = m[r][c];
    if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
  }
  const pat = [1, 0, 1, 1, 1, 0, 1];
  const finder = (get) => {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= n - 7; j++) {
        let ok = true;
        for (let k = 0; k < 7; k++) if (get(i, j + k) !== pat[k]) { ok = false; break; }
        if (!ok) continue;
        const lightBefore = j >= 4 && [0, 1, 2, 3].every(k => get(i, j - 1 - k) === 0);
        const lightAfter = j + 11 <= n && [0, 1, 2, 3].every(k => get(i, j + 7 + k) === 0);
        if (lightBefore || lightAfter) score += 40;
      }
    }
  };
  finder((i, j) => m[i][j]);
  finder((i, j) => m[j][i]);
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dark += m[r][c];
  score += 10 * Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5);
  return score;
}
function qrSvg(text) {
  const m = qrMatrix(text);
  const n = m.length, q = 4, cell = 4, dim = (n + q * 2) * cell;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) d += `M${(c + q) * cell} ${(r + q) * cell}h${cell}v${cell}h-${cell}z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="185" height="185" viewBox="0 0 ${dim} ${dim}" role="img" aria-label="QR code for the invite link"><rect width="${dim}" height="${dim}" fill="#fff"/><path fill="#243438" d="${d}"/></svg>`;
}
