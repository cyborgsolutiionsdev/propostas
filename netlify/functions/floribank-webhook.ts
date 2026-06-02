import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const signatureHeader = event.headers['floribank-signature'] || '';
  const rawBody = event.body || '';

  // 1. Parse da assinatura (t=timestamp, v1=hash)
  const parts = signatureHeader.split(',');
  let t = '';
  let v1 = '';
  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key?.trim() === 't') t = val.trim();
    if (key?.trim() === 'v1') v1 = val.trim();
  }

  if (!t || !v1) {
    return { statusCode: 400, body: 'Assinatura inválida' };
  }

  const secretKey = process.env.VITE_FLORIBANK_SECRET_KEY || '';

  // 2. Validação Criptográfica HMAC SHA256
  const message = `${t}.${rawBody}`;
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');

  if (calculatedHash !== v1) {
    return { statusCode: 401, body: 'Assinatura não coincide' };
  }

  try {
    const payload = JSON.parse(rawBody);
    const ev = payload.event;
    const charge = payload.data;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (ev === 'charge.paid') {
      const proposalId = charge.correlation_id;

      const { error } = await supabase
        .from('propostas')
        .update({ status: 'entregue' })
        .eq('id', proposalId);

      if (error) {
        return { statusCode: 500, body: `Erro ao atualizar proposta: ${error.message}` };
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
