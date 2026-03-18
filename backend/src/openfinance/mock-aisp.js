const mockConsents = new Map();

function sampleAccounts(institution) {
  return [
    {
      external_account_id: `${institution}-ACC-01`,
      type: 'CHECKING',
      currency: 'BRL',
      masked_number: '****1234',
      name: `${institution} Conta Corrente`
    }
  ];
}

function sampleTransactions(accountId, fromDate) {
  return [
    {
      external_tx_id: `${accountId}-tx-1`,
      booked_at: fromDate,
      amount: -125.45,
      currency: 'BRL',
      description: 'Mercado mensal',
      merchant: 'Supermercado XPTO',
      category: 'Alimentação'
    },
    {
      external_tx_id: `${accountId}-tx-2`,
      booked_at: fromDate,
      amount: 2500.0,
      currency: 'BRL',
      description: 'Salário',
      merchant: 'Empresa',
      category: 'Salário'
    }
  ];
}

export function registerMockAispRoutes(app) {
  app.post('/mock-aisp/consents', (req, res) => {
    const consent_ref = `mock-consent-${Date.now()}`;
    const code = `mock-code-${Date.now()}`;
    mockConsents.set(code, {
      consent_ref,
      institution: req.body.institution,
      scopes: req.body.scopes || [],
      user_id: req.body.user_id,
      created_at: new Date().toISOString(),
      revoked: false
    });

    const redirect_url = `${req.body.redirect_uri}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(req.body.state)}`;
    return res.json({ redirect_url, consent_ref });
  });

  app.post('/mock-aisp/token', (req, res) => {
    const entry = mockConsents.get(req.body.code);
    if (!entry || entry.revoked) {
      return res.status(400).json({ message: 'invalid_code' });
    }

    return res.json({
      access_token: `atk-${entry.consent_ref}`,
      refresh_token: `rtk-${entry.consent_ref}`,
      token_type: 'Bearer',
      expires_in: 3600,
      consent_ref: entry.consent_ref,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
    });
  });

  app.get('/mock-aisp/accounts', (req, res) => {
    const consentRef = req.query.consent_ref;
    const entry = [...mockConsents.values()].find((x) => x.consent_ref === consentRef && !x.revoked);
    if (!entry) return res.status(404).json({ message: 'consent_not_found' });
    return res.json({ accounts: sampleAccounts(entry.institution) });
  });

  app.get('/mock-aisp/transactions', (req, res) => {
    const consentRef = req.query.consent_ref;
    const entry = [...mockConsents.values()].find((x) => x.consent_ref === consentRef && !x.revoked);
    if (!entry) return res.status(404).json({ message: 'consent_not_found' });
    return res.json({ transactions: sampleTransactions(req.query.account_external_id, req.query.from_date) });
  });

  app.post('/mock-aisp/consents/:consentRef/revoke', (req, res) => {
    const consentRef = req.params.consentRef;
    for (const [code, val] of mockConsents.entries()) {
      if (val.consent_ref === consentRef) {
        mockConsents.set(code, { ...val, revoked: true });
      }
    }
    return res.json({ revoked: true });
  });
}
