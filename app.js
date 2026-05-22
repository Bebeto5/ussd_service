const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // USSD gateways POST form-encoded

// ── Swagger UI ───────────────────────────────────────────────
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'USSD Service API',
    swaggerOptions: {
      defaultModelsExpandDepth: -1, // hide schemas section by default
    },
  })
);

// ── Session store (in-memory for dev; swap for Redis in prod) ─
const sessions = new Map();

// ── USSD menu logic ──────────────────────────────────────────
function handleUssd(sessionId, phoneNumber, ussdString) {
  // Split input on * to get each menu selection in sequence
  const parts = ussdString === '' ? [] : ussdString.split('*');
  const level = parts.length;

  if (level === 0) {
    // First request — show main menu
    sessions.set(sessionId, { phone: phoneNumber, started: Date.now() });
    return 'CON Welcome to MyService\n1. Check balance\n2. Buy airtime\n3. Help';
  }

  const choice = parts[0];

  if (choice === '1') {
    // Check balance — in real app query your DB here
    sessions.delete(sessionId);
    return `END Your balance is GHS 42.00.\nThank you, ${phoneNumber}.`;
  }

  if (choice === '2') {
    if (level === 1) {
      return 'CON Enter amount to buy (GHS):\n0. Back';
    }
    if (parts[1] === '0') {
      return 'CON Welcome to MyService\n1. Check balance\n2. Buy airtime\n3. Help';
    }
    const amount = parseFloat(parts[1]);
    if (isNaN(amount) || amount <= 0) {
      sessions.delete(sessionId);
      return 'END Invalid amount. Please try again.';
    }
    sessions.delete(sessionId);
    return `END GHS ${amount.toFixed(2)} airtime purchased successfully.`;
  }

  if (choice === '3') {
    sessions.delete(sessionId);
    return 'END For help call 100 or visit myservice.com';
  }

  sessions.delete(sessionId);
  return 'END Invalid option. Please try again.';
}

// ── POST /ussd ───────────────────────────────────────────────
app.post('/ussd', (req, res) => {
  const { sessionId, serviceCode, phoneNumber, ussdString } = req.body;

  // Validate required fields
  if (!sessionId || !phoneNumber || ussdString === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: sessionId, phoneNumber, ussdString',
      code: 400,
    });
  }

  console.log(`[USSD] session=${sessionId} phone=${phoneNumber} input="${ussdString}"`);

  try {
    const response = handleUssd(sessionId, phoneNumber, ussdString);
    console.log(`[USSD] response="${response.substring(0, 60)}..."`);

    // USSD gateways expect plain text
    res.set('Content-Type', 'text/plain');
    return res.send(response);
  } catch (err) {
    console.error('[USSD] Error:', err);
    res.set('Content-Type', 'text/plain');
    return res.send('END Something went wrong. Please try again later.');
  }
});

// ── GET /health ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Start server ─────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`USSD service running on port ${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
    console.log(`Health:     http://localhost:${PORT}/health`);
  });
}

module.exports = app; // exported for testing
