const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const FIRST = {
  0: 'LLLLLL', 1: 'LLGLGG', 2: 'LLGGLG', 3: 'LLGGGL', 4: 'LGLLGG',
  5: 'LGGLLG', 6: 'LGGGLL', 7: 'LGLGLG', 8: 'LGLGGL', 9: 'LGGLGL',
};

export const ean13CheckDigit = (digits12) => {
  const d = String(digits12).split('').map(Number);
  const sum = d.reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
};

export const encodeEan13 = (code) => {
  const c = String(code);
  if (!/^\d{13}$/.test(c)) throw new Error('EAN-13 requires exactly 13 digits');
  const first = c[0];
  const left = c.slice(1, 7);
  const right = c.slice(7, 13);
  const pattern = FIRST[first];
  let bits = '101';
  left.split('').forEach((ch, i) => {
    bits += (pattern[i] === 'L' ? L : G)[Number(ch)];
  });
  bits += '01010';
  right.split('').forEach((ch) => {
    bits += R[Number(ch)];
  });
  bits += '101';
  return bits;
};