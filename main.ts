// Tiny stack VM: runs every /input/<id>/program.bin on its input.bin, writes
// /output/<id>/stdout.bin + exit.txt. 32-bit wrap, 256-value stack, 64-deep call
// stack, 256 words of memory, traps 2..11, 1M step limit, 64K output cap.
// Semantics follow ISA.md + the kit reference VM exactly; no clock, no env.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Q[op] = pops*4 + pushes. Binary ops (2,1)=9 over 0x10..0x22 by default;
// NEG/NOT/LOAD (1,1)=5, PUSH/IN (0,1)=1, POP/JZ/JNZ/PRINT/PUTC/EXIT (1,0)=4.
const Q = new Uint8Array(256);
for (let i = 16; i < 35; i++) Q[i] = 9;
Q[23] = Q[27] = Q[64] = 5;
Q[1] = Q[2] = Q[82] = 1;
Q[4] = 6; Q[5] = 10; Q[6] = 11; Q[7] = 15; Q[65] = 8;
for (const o of [3, 49, 50, 80, 81, 83]) Q[o] = 4;

function run(p, q) {
  const n = p.length, D = new Int32Array(256), C = new Int32Array(64);
  const M = new Int32Array(256), o = new Uint8Array(65536);
  let s = 0, c = 0, l = 0, ip = 0, pc = 0, t = 0, e = 0;
  L: for (;;) {
    if (t === 1e6) { e = 10; break; }
    if (pc < 0 || pc >= n) { e = 9; break; }
    const op = p[pc], m = op === 1 ? 1 : op === 2 ? 4 : op > 47 && op < 52 ? 2 : 0;
    if (!(op < 8 || (op > 15 && op < 35 && op !== 31) || (op > 47 && op < 53) ||
      (op > 63 && op < 66) || (op > 79 && op < 84))) { e = 5; break; }
    if (pc + m >= n) { e = 9; break; }
    t++;
    const y = Q[op], po = y >> 2, pu = y & 3;
    if (s < po) { e = 2; break; }
    if (s - po + pu > 256) { e = 3; break; }
    const nx = pc + 1 + m;
    pc = nx;
    switch (op) {
      case 0: e = 0; break L;
      case 1: D[s++] = (p[nx - 1] << 24) >> 24; break;
      case 2: D[s++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24); break;
      case 3: s--; break;
      case 4: D[s] = D[s - 1]; s++; break;
      case 5: { const v = D[s - 1]; D[s - 1] = D[s - 2]; D[s - 2] = v; break; }
      case 6: D[s] = D[s - 2]; s++; break;
      case 7: { const a = D[s - 3]; D[s - 3] = D[s - 2]; D[s - 2] = D[s - 1]; D[s - 1] = a; break; }
      case 23: D[s - 1] = -D[s - 1] | 0; break;
      case 27: D[s - 1] = ~D[s - 1]; break;
      case 48: case 49: case 50: {
        const r = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        if (op === 48 || (op === 49 ? D[--s] === 0 : D[--s] !== 0)) pc = nx + r;
        break;
      }
      case 51:
        if (c === 64) { e = 7; break L; }
        C[c++] = nx; pc = p[nx - 2] | (p[nx - 1] << 8); break;
      case 52:
        if (c === 0) { e = 8; break L; }
        pc = C[--c]; break;
      case 64: {
        const a = D[s - 1];
        if (a < 0 || a > 255) { e = 6; break L; }
        D[s - 1] = M[a]; break;
      }
      case 65: {
        const a = D[s - 1];
        if (a < 0 || a > 255) { e = 6; break L; }
        M[a] = D[s - 2]; s -= 2; break;
      }
      case 80: {
        const d = String(D[--s]);
        if (l + d.length > 65536) { e = 11; break L; }
        for (let i = 0; i < d.length; i++) o[l++] = d.charCodeAt(i);
        break;
      }
      case 81:
        if (l + 1 > 65536) { e = 11; break L; }
        o[l++] = D[--s] & 255; break;
      case 82: D[s++] = ip < q.length ? q[ip++] : -1; break;
      case 83: e = D[--s] & 255; break L;
      default: { // binary ops 0x10..0x22 except NEG(23)/NOT(27)
        const b = D[s - 1], a = D[s - 2];
        if (op > 18 && op < 23 && b === 0) { e = 4; break L; }
        let r;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
        else if (op === 20) r = b === -1 ? 0 : (a % b) | 0;
        else if (op === 21) r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        else if (op === 22) r = ((a >>> 0) % (b >>> 0)) | 0;
        else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        D[s - 2] = r; s--;
      }
    }
  }
  return [o.slice(0, l), e];
}

for (const id of readdirSync(I).sort()) {
  const [out, e] = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), out);
  writeFileSync(join(O, id, 'exit.txt'), e + '\n');
}
