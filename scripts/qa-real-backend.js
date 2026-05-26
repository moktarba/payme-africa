const assert = require('assert');
const crypto = require('crypto');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const PHONE = process.env.QA_PHONE || '+221771234567';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data.message || response.statusText;
    throw new Error(`${options.method || 'GET'} ${path} failed (${response.status}): ${message}`);
  }
  return data;
}

async function main() {
  const health = await request('/health');
  assert.strictEqual(health.success, true, 'health endpoint should answer');

  const otp = await request('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: PHONE, purpose: 'login' }),
  });
  assert.ok(otp.devCode, 'dev OTP should be available in local development');

  const auth = await request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone: PHONE, code: otp.devCode }),
  });
  assert.ok(auth.accessToken, 'access token should be returned');

  const authHeader = { Authorization: `Bearer ${auth.accessToken}` };

  const merchant = await request('/merchants/me', { headers: authHeader });
  assert.ok(merchant.merchant, 'merchant profile should be returned');

  const methods = await request('/merchants/me/payment-methods', { headers: authHeader });
  assert.ok(methods.paymentMethods.some((method) => method.provider === 'cash' && method.is_enabled), 'cash should be enabled');

  const catalog = await request('/catalog', { headers: authHeader });
  assert.ok(Array.isArray(catalog.items), 'catalog should return items');

  const employees = await request('/employees', { headers: authHeader });
  assert.ok(Array.isArray(employees.employees), 'employees should return active employees');

  await request('/notifications/preferences', {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({ txPending: true, txConfirmed: true, employeeLogin: true }),
  });

  const clientReference = crypto.randomUUID();
  const created = await request('/transactions', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      amount: 1500,
      paymentProvider: 'cash',
      note: 'QA backend reel',
      clientReference,
    }),
  });
  assert.strictEqual(created.transaction.paymentStatus, 'awaiting_confirmation');

  const confirmed = await request(`/transactions/${created.transaction.id}/confirm`, {
    method: 'POST',
    headers: authHeader,
  });
  assert.strictEqual(confirmed.transaction.paymentStatus, 'completed');

  const history = await request('/transactions?limit=5', { headers: authHeader });
  assert.ok(history.transactions.some((tx) => tx.id === created.transaction.id), 'history should include created transaction');

  const notifications = await request('/notifications?limit=20', { headers: authHeader });
  const related = notifications.notifications.filter((item) => item.data?.transactionId === created.transaction.id);
  assert.ok(related.some((item) => item.type === 'transaction_pending'), 'pending notification should exist');
  assert.ok(related.some((item) => item.type === 'transaction_confirmed'), 'confirmed notification should exist');

  const stats = await request('/transactions/stats/day', { headers: authHeader });
  assert.ok(stats.stats.completedCount >= 1, 'day stats should include completed transactions');

  console.log('QA backend reel OK');
  console.log(`API: ${API_URL}`);
  console.log(`Marchand: ${merchant.merchant.business_name || merchant.merchant.businessName}`);
  console.log(`Transaction: ${created.transaction.id}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
