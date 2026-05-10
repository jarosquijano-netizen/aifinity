import axios from 'axios';

const BASE_URL = process.env.SALTEDGE_BASE_URL || 'https://www.saltedge.com/api/v5';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'App-id': process.env.SALTEDGE_APP_ID,
    'Secret': process.env.SALTEDGE_SECRET,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

export async function createCustomer(identifier) {
  const { data } = await client.post('/customers', {
    data: { identifier: String(identifier) },
  });
  return data.data;
}

export async function createConnectSession(customerId, returnTo) {
  const { data } = await client.post('/connect_sessions/create', {
    data: {
      customer_id: customerId,
      consent: {
        scopes: ['account_details', 'transactions_details'],
      },
      attempt: {
        return_to: returnTo,
        fetch_scopes: ['accounts', 'transactions'],
      },
    },
  });
  return data.data;
}

export async function listConnections(customerId) {
  const { data } = await client.get('/connections', {
    params: { customer_id: customerId },
  });
  return data.data;
}

export async function getConnection(connectionId) {
  const { data } = await client.get(`/connections/${connectionId}`);
  return data.data;
}

export async function refreshConnection(connectionId) {
  const { data } = await client.put(`/connections/${connectionId}/refresh`, {
    data: { fetch_scopes: ['accounts', 'transactions'] },
  });
  return data.data;
}

export async function removeConnection(connectionId) {
  const { data } = await client.delete(`/connections/${connectionId}`);
  return data.data;
}

export async function listAccounts(connectionId) {
  const { data } = await client.get('/accounts', {
    params: { connection_id: connectionId },
  });
  return data.data;
}

export async function listTransactions(connectionId, accountId, fromId = null) {
  const all = [];
  let nextId = fromId;
  do {
    const params = { connection_id: connectionId, account_id: accountId };
    if (nextId) params.from_id = nextId;
    const { data } = await client.get('/transactions', { params });
    all.push(...data.data);
    nextId = data.meta?.next_id || null;
  } while (nextId);
  return all;
}
