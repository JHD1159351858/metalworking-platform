const mmPrecision = 10000;

// All comparisons use ten-thousandths of a millimetre, including the endpoints.
function mmInteger(value) {
  const text = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const amount = Number(whole) * mmPrecision + Number(fraction.padEnd(4, '0'));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function measurementResult(value, lower, upper) {
  const actual = mmInteger(value);
  const min = mmInteger(lower);
  const max = mmInteger(upper);
  if (actual === null || min === null || max === null || min > max) return null;
  if (actual < min) return { relation: '低于下限', distance: (min - actual) / mmPrecision };
  if (actual > max) return { relation: '高于上限', distance: (actual - max) / mmPrecision };
  return { relation: '位于允许范围内', distance: 0 };
}

export function measurementText(result) {
  if (!result) return '';
  return result.distance ? result.relation + ' ' + result.distance + ' mm' : result.relation;
}

export const reviewFields = { plan: '工艺方案', measurements: '测量记录', files: '附件材料', notes: '过程记录' };
