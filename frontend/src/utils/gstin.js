export const STATE_CODES = {
  1: 'Jammu & Kashmir', 2: 'Himachal Pradesh', 3: 'Punjab', 4: 'Chandigarh', 5: 'Uttarakhand',
  6: 'Haryana', 7: 'Delhi', 8: 'Rajasthan', 9: 'Uttar Pradesh', 10: 'Bihar', 11: 'Sikkim',
  12: 'Arunachal Pradesh', 13: 'Nagaland', 14: 'Manipur', 15: 'Mizoram', 16: 'Tripura',
  17: 'Meghalaya', 18: 'Assam', 19: 'West Bengal', 20: 'Jharkhand', 21: 'Odisha',
  22: 'Chhattisgarh', 23: 'Madhya Pradesh', 24: 'Gujarat', 26: 'Dadra & Nagar Haveli and Daman & Diu',
  27: 'Maharashtra', 29: 'Karnataka', 30: 'Goa', 31: 'Lakshadweep', 32: 'Kerala',
  33: 'Tamil Nadu', 34: 'Puducherry', 35: 'Andaman & Nicobar', 36: 'Telangana', 37: 'Andhra Pradesh', 38: 'Ladakh',
};

const CHECK_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function checkDigitOk(gstin) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const cv = CHECK_CHARS.indexOf(gstin[i]);
    if (cv < 0) return false;
    sum += cv * (Math.pow(2, i + 1) % 36);
  }
  const mod = sum % 36;
  const expected = mod === 0 ? 'Z' : CHECK_CHARS[36 - mod];
  return expected === gstin[14];
}

export function validateGstin(raw) {
  const gstin = String(raw || '').trim().toUpperCase();
  const errors = [];
  const warnings = [];
  const breakdown = { stateCode: null, stateName: '', pan: '', entityType: '', entityTypeName: '', checkDigitOk: null };

  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
    errors.push('GSTIN must be exactly 15 characters (letters/digits only)');
    return { gstin: raw, valid: false, errors, warnings, breakdown };
  }
  const stateCode = Number(gstin.slice(0, 2));
  breakdown.stateCode = gstin.slice(0, 2);
  breakdown.stateName = STATE_CODES[stateCode] || '';
  if (!STATE_CODES[stateCode]) errors.push(`"${gstin.slice(0, 2)}" is not a valid state/UT code`);

  breakdown.pan = gstin.slice(2, 12);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(breakdown.pan)) errors.push('Characters 3-12 must be a valid PAN (5 letters, 4 digits, 1 letter)');

  breakdown.entityType = gstin[12];
  breakdown.entityTypeName = {
    '1': 'Registrar of Companies (companies, LLP, foreign company)',
    '2': 'Registrar of Firms (partnership, LLP registered with RoF)',
    '3': 'Sole proprietorship (no registration with RoC)',
    '4': 'Trust / NGO / society',
    '5': 'Special category / others',
  }[breakdown.entityType] || (breakdown.entityType >= 'A' && breakdown.entityType <= 'Z' ? 'Individual / others' : '');
  if (!/^[1-9A-Z]$/.test(breakdown.entityType)) errors.push('Char 13 (entity type) must be a valid entity code (1-9 or A-Z)');
  if (!/^[1-9A-Z]$/.test(gstin[13])) errors.push('Character 14 must be a valid checksum character (1-9 or A-Z)');
  if (!/^[0-9A-Z]$/.test(gstin[14])) errors.push('Character 15 must be a valid check digit (0-9 or A-Z)');
  if (errors.length === 0) {
    breakdown.checkDigitOk = checkDigitOk(gstin);
    if (breakdown.checkDigitOk === false) warnings.push('GSTIN failed the last-character check digit (please double-check the number)');
  }

  return { gstin, valid: errors.length === 0, errors, warnings, breakdown };
}