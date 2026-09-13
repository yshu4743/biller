export const formatCurrency = (n, digits = 2) => {
  const num = Number(n) || 0;
  return num.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const amountToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
};

export const getIndiaStates = () => [
  { name: 'Andhra Pradesh', code: 37 }, { name: 'Arunachal Pradesh', code: 12 },
  { name: 'Assam', code: 18 }, { name: 'Bihar', code: 10 }, { name: 'Chandigarh', code: 4 },
  { name: 'Chhattisgarh', code: 22 }, { name: 'Delhi', code: 7 }, { name: 'Goa', code: 30 },
  { name: 'Gujarat', code: 24 }, { name: 'Haryana', code: 6 }, { name: 'Himachal Pradesh', code: 2 },
  { name: 'Jammu & Kashmir', code: 1 }, { name: 'Jharkhand', code: 20 }, { name: 'Karnataka', code: 29 },
  { name: 'Kerala', code: 32 }, { name: 'Madhya Pradesh', code: 23 }, { name: 'Maharashtra', code: 27 },
  { name: 'Manipur', code: 14 }, { name: 'Meghalaya', code: 17 }, { name: 'Mizoram', code: 15 },
  { name: 'Nagaland', code: 13 }, { name: 'Odisha', code: 21 }, { name: 'Puducherry', code: 34 },
  { name: 'Punjab', code: 3 }, { name: 'Rajasthan', code: 8 }, { name: 'Sikkim', code: 11 },
  { name: 'Tamil Nadu', code: 33 }, { name: 'Telangana', code: 36 }, { name: 'Tripura', code: 16 },
  { name: 'Uttar Pradesh', code: 9 }, { name: 'Uttarakhand', code: 5 }, { name: 'West Bengal', code: 19 },
];

export const currencyInr = (n) => '₹ ' + formatCurrency(n);