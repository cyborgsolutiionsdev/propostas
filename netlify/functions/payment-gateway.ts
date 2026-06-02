import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const apiUrl = process.env.VITE_FLORIBANK_API_URL || 'https://api.floribank.com.br/api/v1';
  const secretKey = process.env.VITE_FLORIBANK_SECRET_KEY || '';

  if (!secretKey) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'A chave secreta FloriBank não está configurada nas variáveis de ambiente do Netlify.' }) 
    };
  }

  // 1. CRIAR COBRANÇA PIX (POST)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const response = await fetch(`${apiUrl}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return { statusCode: response.status, headers, body: JSON.stringify(data) };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // 2. CONSULTAR COBRANÇA (GET com query param ?id=ch_...)
  if (event.httpMethod === 'GET') {
    try {
      const chargeId = event.queryStringParameters?.id;
      if (!chargeId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID da cobrança não informado' }) };
      }
      const response = await fetch(`${apiUrl}/charges/${chargeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`
        }
      });
      const data = await response.json();
      return { statusCode: response.status, headers, body: JSON.stringify(data) };
    } catch (err: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
};
