import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measurementResult, measurementText } from '../src/practical-work.js';

test('length self-check includes both endpoints and reports the exact distance', () => {
  const check = value => measurementText(measurementResult(value, '19.90', '20.10'));
  assert.equal(check('19.9000'), '位于允许范围内');
  assert.equal(check('20.1'), '位于允许范围内');
  assert.equal(check('20.12'), '高于上限 0.02 mm');
  assert.equal(check('19.8999'), '低于下限 0.0001 mm');
  assert.equal(measurementText(measurementResult('0', '0', '0')), '位于允许范围内');
});

test('missing, invalid or reversed dimensional requirements do not produce verdicts', () => {
  for (const actual of ['', ' ', '.', '20,10', '19mm', '20.00001', '-1', 'Infinity', '2e1', '1000000000000000000']) {
    assert.equal(measurementResult(actual, '19.90', '20.10'), null);
  }
  assert.equal(measurementResult('20', '21', '19'), null);
  assert.equal(measurementResult('20', null, '21'), null);
});
