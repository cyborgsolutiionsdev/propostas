-- SQL Schema to create the propostas table in your Supabase project.
-- Run this script inside the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.propostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cliente_nome TEXT NOT NULL,
    empresa_nome TEXT NOT NULL,
    cnpj TEXT,
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade TEXT,
    url_presite TEXT,
    preco NUMERIC NOT NULL,
    chave_pix TEXT,
    vagas_restantes INTEGER DEFAULT 4,
    status TEXT DEFAULT 'criada' CHECK (status IN ('criada', 'enviada', 'aguardando_aprovacao', 'aprovada', 'entregue')),
    assinatura_nome TEXT,
    assinatura_data TIMESTAMP WITH TIME ZONE,
    slug TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (Anon key)
CREATE POLICY "Permitir leitura pública" ON public.propostas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública" ON public.propostas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir update público" ON public.propostas
    FOR UPDATE USING (true);
