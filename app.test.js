const request = require('supertest');
const app = require('./app');

describe('POST /ussd', () => {
  const base = {
    sessionId: 'test-session-001',
    serviceCode: '*123#',
    phoneNumber: '+233241234567',
  };

  test('returns main menu on fresh session', async () => {
    const res = await request(app)
      .post('/ussd')
      .send({ ...base, ussdString: '' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^CON /);
    expect(res.text).toContain('Check balance');
  });

  test('returns balance on selecting option 1', async () => {
    const res = await request(app)
      .post('/ussd')
      .send({ ...base, ussdString: '1' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^END /);
    expect(res.text).toContain('balance');
  });

  test('prompts for amount on selecting option 2', async () => {
    const res = await request(app)
      .post('/ussd')
      .send({ ...base, ussdString: '2' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^CON /);
    expect(res.text).toContain('amount');
  });

  test('completes airtime purchase with valid amount', async () => {
    const res = await request(app)
      .post('/ussd')
      .send({ ...base, ussdString: '2*10' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^END /);
    expect(res.text).toContain('10.00');
  });

  test('returns error for invalid amount', async () => {
    const res = await request(app)
      .post('/ussd')
      .send({ ...base, ussdString: '2*abc' });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/^END Invalid amount/);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/ussd')
      .send({ sessionId: 'x' }); // missing phoneNumber and ussdString

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/);
  });
});

describe('GET /health', () => {
  test('returns 200 with ok status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });
});
