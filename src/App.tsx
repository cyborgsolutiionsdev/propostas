import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ChevronRight, 
  ChevronLeft, 
  Monitor, 
  Cpu, 
  Sparkles, 
  Clock, 
  Settings, 
  Download, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  ShieldCheck, 
  Globe,
  DollarSign,
  TrendingUp,
  Stethoscope,
  AlertTriangle,
  Zap,
  Activity,
  Layers2,
  FileCheck,
  Share2,
  Copy,
  Check,
  Plus,
  Trash2,
  Mail,
  Phone,
  Loader2
} from 'lucide-react';
import { supabase } from './supabaseClient';

export interface Proposal {
  id: string;
  created_at?: string;
  cliente_nome: string;
  empresa_nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  url_presite?: string;
  preco: number;
  chave_pix?: string;
  vagas_restantes?: number;
  status: 'enviada' | 'aguardando_aprovacao' | 'aprovada' | 'entregue';
  assinatura_nome?: string;
  assinatura_data?: string;
  slug?: string;
}


// Configuration keys for FloriBank Gateway
const FLORIBANK_API_URL = import.meta.env.VITE_FLORIBANK_API_URL || 'https://sandbox.floribank.com.br/api/v1';
const FLORIBANK_SECRET_KEY = import.meta.env.VITE_FLORIBANK_SECRET_KEY || 'fp_sec_test_placeholder';

export default function App() {
  const [clientData, setClientData] = useState({
    id: "",
    clinicName: "Bett Odontologia",
    representative: "Dr. Roberto Bett",
    cnpj: "12.345.678/0001-90",
    address: "Av. Beira Mar, 1200, Sala 402",
    city: "Florianópolis - SC",
    phone: "(48) 99123-4567",
    email: "roberto@bettodontologia.com.br",
    preSiteUrl: "https://bettodontologia.netlify.app/",
    price: 497.00,
    spotsLeft: 4,
    pixKey: "financeiro@cyborgsolutions.com.br"
  });

  const [activeSlide, setActiveSlide] = useState(0);
  const [showConfig, setShowConfig] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [signatureApproved, setSignatureApproved] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  
  // Admin & CRM states
  const [adminTab, setAdminTab] = useState('editor');
  const [proposalsList, setProposalsList] = useState<Proposal[]>([]);
  const [saveStatus, setSaveStatus] = useState('');

  // FloriBank Checkout states
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [pixBrCode, setPixBrCode] = useState("");
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState("");
  const [chargeId, setChargeId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("PENDING"); // PENDING | PAID | EXPIRED
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Initialize data based on URL
  useEffect(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const isPathAdmin = path === 'admin';
    setIsAdminMode(isPathAdmin);
    setShowConfig(isPathAdmin);

    const loadProposalData = async () => {
      let query = null;
      if (id) {
        query = supabase.from('propostas').select('*').eq('id', id).single();
      } else if (path && path !== 'admin') {
        query = supabase.from('propostas').select('*').eq('slug', path).single();
      }

      if (query) {
        const { data, error } = await query;
        if (data && !error) {
          setClientData({
            id: data.id,
            clinicName: data.empresa_nome,
            representative: data.cliente_nome,
            cnpj: data.cnpj || '',
            address: data.endereco || '',
            city: data.cidade || '',
            phone: data.telefone || '',
            email: data.email || '',
            preSiteUrl: data.url_presite || '',
            price: Number(data.preco),
            spotsLeft: data.vagas_restantes || 4,
            pixKey: data.chave_pix || 'financeiro@cyborgsolutions.com.br'
          });
          setIsAdminMode(false);
          setShowConfig(false);
          if (data.status === 'aprovada' || data.status === 'entregue') {
            setSignatureApproved(true);
            setSignatureName(data.assinatura_nome || '');
            if (data.status === 'entregue') {
              setPaymentStatus('PAID');
            }
          }
        }
      }
    };

    loadProposalData();
  }, []);

  // Fetch proposals list for Kanban CRM Board
  const fetchProposals = async () => {
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setProposalsList(data);
    }
  };

  useEffect(() => {
    if (isAdminMode && adminTab === 'crm') {
      fetchProposals();
    }
  }, [isAdminMode, adminTab]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  // Save new proposal dynamically to Supabase CRM
  const handleSaveProposal = async () => {
    setSaveStatus('saving');
    const slug = clientData.clinicName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const payload = {
      cliente_nome: clientData.representative,
      empresa_nome: clientData.clinicName,
      cnpj: clientData.cnpj,
      telefone: clientData.phone,
      email: clientData.email,
      endereco: clientData.address,
      cidade: clientData.city,
      url_presite: clientData.preSiteUrl,
      preco: clientData.price,
      chave_pix: clientData.pixKey,
      vagas_restantes: clientData.spotsLeft,
      slug: slug,
      status: 'criada'
    };

    let result;
    if (clientData.id) {
      result = await supabase.from('propostas').update(payload).eq('id', clientData.id).select();
    } else {
      result = await supabase.from('propostas').insert([payload]).select();
    }

    const { data, error } = result;

    if (!error && data && data[0]) {
      setClientData(prev => ({ ...prev, id: data[0].id }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(''), 3000);
      return data[0].id;
    } else {
      console.error(error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(''), 3000);
      return null;
    }
  };

  // Generate public dynamic link to view proposal
  const generateShareableLink = (id = clientData.id) => {
    if (!id) return window.location.origin;
    return `${window.location.origin}/?id=${id}`;
  };

  const copyToClipboard = async () => {
    let activeId = clientData.id;
    if (!activeId) {
      activeId = await handleSaveProposal();
    }
    if (activeId) {
      const link = generateShareableLink(activeId);
      navigator.clipboard.writeText(link);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 3000);
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixBrCode || clientData.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Client accepts and triggers FloriBank payment creation
  const handleClientAccept = async () => {
    if (signatureName.trim().length <= 3) return;
    setIsLoadingPayment(true);

    const signalValueInCents = Math.round((clientData.price / 2) * 100);

    try {
      // Create charge in FloriBank API
      const response = await fetch(`${FLORIBANK_API_URL}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FLORIBANK_SECRET_KEY}`
        },
        body: JSON.stringify({
          value: signalValueInCents,
          payment_method: 'PIX',
          correlation_id: clientData.id || `local_${Date.now()}`,
          description: `Sinal 50% - Proposta Cyborg Solutions para ${clientData.clinicName}`,
          customer: {
            name: signatureName,
            document: clientData.cnpj.replace(/\D/g, ''),
            email: clientData.email
          }
        })
      });

      const resData = await response.json();

      if (response.ok && resData) {
        setPixBrCode(resData.br_code);
        setPixQrCodeUrl(resData.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(resData.br_code)}`);
        setChargeId(resData.id);
        
        // Update database with signature, signature date and proposal status
        if (clientData.id) {
          await supabase
            .from('propostas')
            .update({
              status: 'aprovada',
              assinatura_nome: signatureName,
              assinatura_data: new Date().toISOString()
            })
            .eq('id', clientData.id);
        }
        
        setSignatureApproved(true);
      } else {
        alert(`Erro do Gateway FloriBank: ${resData?.error?.message || 'Falha ao processar cobrança'}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erro na conexão com o servidor de pagamentos FloriBank.");
    } finally {
      setIsLoadingPayment(false);
    }
  };

  // Query/Poll FloriBank charge status dynamically
  const checkPaymentStatus = async () => {
    if (!chargeId) return;
    setCheckingPayment(true);

    try {
      const response = await fetch(`${FLORIBANK_API_URL}/charges/${chargeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLORIBANK_SECRET_KEY}`
        }
      });
      const data = await response.json();

      if (response.ok && data) {
        setPaymentStatus(data.status);
        if (data.status === 'PAID') {
          // Update status to delivered/paid in Supabase
          if (clientData.id) {
            await supabase
              .from('propostas')
              .update({ status: 'entregue' })
              .eq('id', clientData.id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingPayment(false);
    }
  };

  // Auto-poll status when charge is created
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (signatureApproved && chargeId && paymentStatus === 'PENDING') {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 5000); // Check every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [signatureApproved, chargeId, paymentStatus]);

  // Update proposal status from Kanban Board
  const handleUpdateStatus = async (proposalId: string, nextStatus: string) => {
    const { error } = await supabase
      .from('propostas')
      .update({ status: nextStatus })
      .eq('id', proposalId);
    
    if (!error) {
      fetchProposals();
    }
  };

  // Delete proposal from Kanban Board
  const handleDeleteProposal = async (proposalId: string) => {
    if (confirm("Deseja realmente deletar esta proposta?")) {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', proposalId);
      
      if (!error) {
        fetchProposals();
      }
    }
  };

  // Premium Logo with Metallic & Cyan Gradients
  const CyborgLogo = ({ className = "h-20" }) => (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative group">
        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl group-hover:bg-cyan-500/30 transition-all duration-500"></div>
        <svg className="w-24 h-24 relative z-10 filter drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="metalGrad" x1="20" y1="20" x2="100" y2="170" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#cbd5e1" />
              <stop offset="70%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id="neonCyanGrad" x1="100" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#0088ff" />
              <stop offset="100%" stopColor="#0033aa" />
            </linearGradient>
          </defs>
          <path d="M100 20C75 20 55 35 45 55C40 65 40 75 42 85L35 100C32 106 35 112 40 115L45 125C47 130 52 135 58 138L62 150C63 154 68 158 72 158H100V20Z" fill="url(#metalGrad)" />
          <path d="M48 60L75 50L85 65L65 80L48 60Z" fill="#475569" stroke="#0f172a" strokeWidth="2" />
          <path d="M45 88L70 82L80 98L55 105L45 88Z" fill="#334155" stroke="#0f172a" strokeWidth="2" />
          <path d="M55 110L78 105L85 120L62 125L55 110Z" fill="#475569" stroke="#0f172a" strokeWidth="2" />
          <rect x="52" y="72" width="22" height="6" rx="3" fill="#ffffff" />
          <rect x="56" y="74" width="8" height="2" rx="1" fill="#00f0ff" />
          <circle cx="85" cy="90" r="12" fill="#0f172a" stroke="#1e293b" strokeWidth="2" />
          <circle cx="85" cy="90" r="5" fill="#00f0ff" />
          <path d="M72 158L78 175C79 178 83 180 86 180H100V158H72Z" fill="#334155" />
          <circle cx="84" cy="170" r="3" fill="#00f0ff" />
          <line x1="100" y1="15" x2="100" y2="185" stroke="#00f0ff" strokeWidth="2" strokeDasharray="3 3" />
          <path d="M100 20C125 20 145 35 155 55C160 65 160 75 158 85C165 95 165 110 158 120C155 130 148 138 140 145C130 155 115 162 100 164V20Z" fill="none" stroke="url(#neonCyanGrad)" strokeWidth="2.5" />
          <path d="M100 45H128V62H145" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="145" cy="62" r="3.5" fill="#00f0ff" />
          <path d="M100 75H135L145 90H160" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="160" cy="90" r="3.5" fill="#00f0ff" />
          <path d="M100 105H118L128 120H142L148 135H138" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="138" cy="135" r="3.5" fill="#00f0ff" />
          <path d="M100 135H115L125 150H138" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="138" cy="150" r="3.5" fill="#00f0ff" />
        </svg>
      </div>
      <span className="text-3xl font-black tracking-[0.3em] text-white mt-3 font-display">CYBORG</span>
      <span className="text-[11px] tracking-[0.55em] text-cyan-400 font-extrabold uppercase mt-1">Solutions</span>
    </div>
  );

  const slides = [
    // Slide 1: Capa (Cover)
    {
      title: "PROPOSTA COMERCIAL",
      subtitle: "Site de Alta Conversão & Posicionamento Digital Premium",
      content: (
        <div className="flex flex-col items-center justify-center text-center h-full py-6">
          <CyborgLogo className="mb-6" />
          <div className="w-28 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-4"></div>
          <p className="text-slate-300 max-w-lg text-sm md:text-base leading-relaxed mb-6 font-medium">
            Desenvolvimento web sob medida com foco estratégico em performance, atração de pacientes particulares e fechamento de tratamentos de alto valor.
          </p>

          <div className="w-full max-w-md bg-slate-900/60 border border-cyan-500/25 p-6 rounded-2xl backdrop-blur-md text-left shadow-[0_0_30px_rgba(0,240,255,0.05)] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-cyan-400 to-blue-500"></div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-black">Preparado exclusivamente para:</p>
            </div>
            
            <h3 className="text-2xl font-black text-white mb-1 tracking-tight font-display">{clientData.clinicName}</h3>
            {clientData.representative && <p className="text-slate-300 text-sm mb-4 font-semibold">A/C: {clientData.representative}</p>}
            
            <div className="border-t border-slate-800/80 pt-3 text-xs text-slate-400 space-y-1.5 font-medium">
              {clientData.cnpj && <p><span className="font-bold text-slate-500">CNPJ/CPF:</span> {clientData.cnpj}</p>}
              {clientData.address && <p><span className="font-bold text-slate-500">Endereço:</span> {clientData.address}</p>}
              {clientData.city && <p><span className="font-bold text-slate-500">Cidade:</span> {clientData.city}</p>}
            </div>
          </div>
        </div>
      )
    },
    // Slide 2: Quem Somos
    {
      title: "QUEM SOMOS",
      subtitle: "Tecnologia de Ponta & Alta Performance",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="text-cyan-400 w-5 h-5" />
              <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">DNA Cyborg</span>
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight leading-tight">
              Nós somos a <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 font-display">Cyborg Solutions</span>.
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Desenvolvemos ecossistemas web sob medida: de landing pages ultrarrápidas a Web Apps complexos e e-commerces integrados. Nosso DNA é focado na intersecção entre <strong className="text-white font-bold">design premium</strong> e <strong className="text-cyan-400 font-bold">velocidade extrema</strong>.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Diferente de agências tradicionais que usam templates engessados que tornam o site lento, nós programamos do zero utilizando as tecnologias mais avançadas do mercado global.
            </p>
          </div>
          
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
            <h4 className="text-xs uppercase tracking-wider text-cyan-400 font-black mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" /> Stack Tecnológica de Elite
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "React", desc: "Interfaces dinâmicas e fluidas" },
                { name: "Next.js", desc: "SEO perfeito e velocidade pura" },
                { name: "Node.js", desc: "Backends robustos e seguros" },
                { name: "Tailwind CSS", desc: "Layout responsivo e moderno" },
                { name: "Vite", desc: "Bundling ultra veloz" },
                { name: "SEO Premium", desc: "Otimização máxima no Google" }
              ].map((tech, idx) => (
                <div key={idx} className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800/80 hover:border-cyan-500/30 transition-all hover:scale-[1.02] cursor-default">
                  <span className="block text-white text-xs font-extrabold">{tech.name}</span>
                  <span className="block text-[10px] text-slate-500 mt-1 font-semibold">{tech.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    // Slide 3: O Desafio
    {
      title: "O DESAFIO DIGITAL",
      subtitle: "Por que clínicas odontológicas perdem pacientes online?",
      content: (
        <div className="space-y-6 py-2">
          <p className="text-slate-300 text-sm max-w-2xl font-medium">
            O comportamento do paciente mudou. Hoje, antes de agendar uma consulta, ele pesquisa sua clínica no Google. Se o seu site não transmitir <strong className="text-white font-bold">autoridade imediata</strong>, ele fechará a aba e agendará com o concorrente.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900/60 border border-red-500/20 p-5 rounded-2xl shadow-lg relative overflow-hidden hover:border-red-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500/80"></div>
              <h4 className="text-white text-sm font-black flex items-center gap-2 mb-2 font-display">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Carregamento Lento
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Sites criados em plataformas genéricas demoram mais de 5 segundos para carregar. Estatísticas mostram que 53% dos usuários abandonam sites que demoram mais de 3 segundos.
              </p>
            </div>
            
            <div className="bg-slate-900/60 border border-red-500/20 p-5 rounded-2xl shadow-lg relative overflow-hidden hover:border-red-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500/80"></div>
              <h4 className="text-white text-sm font-black flex items-center gap-2 mb-2 font-display">
                <Monitor className="w-4 h-4 text-red-500" /> Falha em Celulares
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Mais de 85% do tráfego para clínicas odontológicas vem de celulares. Sites que desconfiguram em telas menores matam as conversões instantaneamente.
              </p>
            </div>

            <div className="bg-slate-900/60 border border-red-500/20 p-5 rounded-2xl shadow-lg relative overflow-hidden hover:border-red-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500/80"></div>
              <h4 className="text-white text-sm font-black flex items-center gap-2 mb-2 font-display">
                <CreditCard className="w-4 h-4 text-red-500" /> Sem Conversão
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Sites sem botões diretos de agendamento por WhatsApp ou CTAs estratégicos forçam o paciente a procurar informações de contato, aumentando a desistência.
              </p>
            </div>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-emerald-400 text-xs font-black uppercase tracking-wider">A Solução Cyborg</h5>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed font-medium">
                Desenvolvemos plataformas baseadas em códigos puros que carregam de forma instantânea (em menos de 1 segundo), oferecendo uma experiência premium.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // Slide 4: Anatomia do Site
    {
      title: "ANATOMIA DO SITE",
      subtitle: "Estrutura focada em gerar agendamentos de tratamentos de alto valor",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
          <div className="space-y-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2 tracking-tight">
              <Stethoscope className="text-cyan-400 w-5 h-5" /> Pilares da sua nova Plataforma
            </h3>
            
            {[
              { title: "Velocidade Instantânea", desc: "Frameworks modernos eliminam o tempo de carregamento, aumentando a pontuação de SEO e reduzindo a rejeição." },
              { title: "Mobile-First Design", desc: "Interface milimetricamente desenhada para oferecer uma experiência de toque agradável e leitura confortável no celular." },
              { title: "Gatilhos de Autoridade Médica", desc: "Destaque claro para qualificações, estrutura física, biossegurança e tecnologias modernas aplicadas na clínica." },
              { title: "Botões de Conversão Persuasiva", desc: "Links e formulários de agendamento direcionados estrategicamente que guiam o paciente rumo ao WhatsApp." }
            ].map((pilar, idx) => (
              <div key={idx} className="bg-slate-950/80 p-3 rounded-xl border border-slate-900 flex gap-3 hover:border-cyan-500/20 transition-all hover:scale-[1.01]">
                <span className="bg-cyan-950 text-cyan-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-cyan-800/30">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="text-white text-xs font-bold font-display">{pilar.title}</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed font-medium">{pilar.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between shadow-xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
            <div>
              <h4 className="text-xs uppercase tracking-wider text-cyan-400 font-black mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Benefícios de Negócio Esperados
              </h4>
              <ul className="space-y-3 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Aumento expressivo no retorno sobre investimentos em anúncios (Meta Ads / Google Ads).</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Posicionamento de marca premium, permitindo cobrar o preço justo pelos procedimentos.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Filtro de captação focado em pacientes interessados em qualidade e resolutividade.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Independência de portais de terceiros e convênios, fortalecendo a carteira de atendimentos.</span>
                </li>
              </ul>
            </div>
            
            <div className="border-t border-slate-800/80 pt-3 mt-4 text-[10px] text-slate-500 italic text-center font-medium">
              "Um site de alto desempenho não é um custo, mas o vendedor mais barato e eficiente trabalhando 24h para a sua clínica."
            </div>
          </div>
        </div>
      )
    },
    // Slide 5: O Pré-Site do Cliente
    {
      title: "SEU PRÉ-SITE",
      subtitle: "Visualização antecipada da sua estrutura proposta",
      content: (
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl max-w-xl w-full backdrop-blur-md relative overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.08)]">
            <div className="bg-slate-950 px-4 py-2 flex items-center gap-2 border-b border-slate-900">
              <div className="flex gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500/30"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/30"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-green-500/30"></span>
              </div>
              <div className="bg-slate-900/90 text-[10px] text-slate-500 px-4 py-1 rounded-md max-w-xs w-full mx-auto truncate font-mono flex items-center justify-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-600" />
                {clientData.preSiteUrl}
              </div>
            </div>

            <div className="p-8">
              <Monitor className="w-14 h-14 text-cyan-400 mx-auto mb-4 filter drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
              
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight font-display">Esboço Estrutural Ativo</h3>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                Para acelerar nosso alinhamento e demonstrar na prática nosso comprometimento e velocidade, nós já criamos um <strong className="text-cyan-400 font-semibold">pré-site conceitual</strong> estruturado para a <strong className="text-white font-bold">{clientData.clinicName}</strong>. 
              </p>

              <a 
                href={clientData.preSiteUrl}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-8 py-3.5 rounded-xl transition-all transform hover:scale-[1.02] shadow-[0_0_30px_rgba(0,240,255,0.4)] text-xs md:text-sm uppercase tracking-widest"
              >
                Visualizar Pré-Site Proposto <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )
    },
    // Slide 6: Diferenciais
    {
      title: "CASES E DIFERENCIAIS",
      subtitle: "Por que escolher a Cyborg Solutions para a sua clínica?",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-white tracking-tight">Nossos Diferenciais de Entrega</h3>
            <div className="space-y-3">
              {[
                { title: "Código Limpo Propriatário", desc: "Sem plugins pesados de WordPress. Menor chance de bugs e invasões." },
                { title: "Segurança Certificada (SSL)", desc: "Seus dados e de seus pacientes sob criptografia segura e moderna." },
                { title: "Suporte Técnico Direto", desc: "Acesso direto aos desenvolvedores para modificações, sem burocracia ou tickets lentos." }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex items-start gap-3 shadow-md hover:border-cyan-500/10 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white text-xs font-bold font-display">{item.title}</h4>
                    <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
            <div>
              <h3 className="text-xs uppercase tracking-wider text-cyan-400 font-black mb-4 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Caso de Estudo: Alta Performance</span>
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-slate-400 font-medium">Tempo de Carregamento</span>
                  <span className="text-emerald-400 font-extrabold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">0.8s (Instantâneo)</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-slate-400 font-medium">Pontuação SEO Lighthouse</span>
                  <span className="text-emerald-400 font-extrabold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">100 / 100</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900/60">
                  <span className="text-slate-400 font-medium">Taxa de Conversão</span>
                  <span className="text-emerald-400 font-extrabold bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30">+28% de aumento médio</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // Slide 7: Prazos
    {
      title: "CRONOGRAMA & PROCESSOS",
      subtitle: "Do início do contrato ao site no ar em tempo recorde",
      content: (
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 relative shadow-md">
              <div className="absolute -top-3 left-4 bg-cyan-950 text-cyan-400 text-[9px] px-2.5 py-1 rounded border border-cyan-800/30 font-black uppercase tracking-wider">
                Etapa 1
              </div>
              <h4 className="text-white text-sm font-bold mt-2 mb-1 font-display">Aprovação & Layout</h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Alinhamos as cores, referências visuais e aprovamos a estrutura de navegação do site proposto.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 relative shadow-md">
              <div className="absolute -top-3 left-4 bg-cyan-950 text-cyan-400 text-[9px] px-2.5 py-1 rounded border border-cyan-800/30 font-black uppercase tracking-wider">
                Etapa 2
              </div>
              <h4 className="text-white text-sm font-bold mt-2 mb-1 font-display">Coleta de Materiais</h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Envio por parte do cliente de: Logo vetorizada, fotos profissionais da clínica/equipe e textos base.
              </p>
            </div>

            <div className="bg-slate-950 p-5 rounded-xl border border-slate-900 relative shadow-md">
              <div className="absolute -top-3 left-4 bg-cyan-950 text-cyan-400 text-[9px] px-2.5 py-1 rounded border border-cyan-800/30 font-black uppercase tracking-wider">
                Etapa 3
              </div>
              <h4 className="text-white text-sm font-bold mt-2 mb-1 font-display">Lançamento</h4>
              <p className="text-slate-400 text-xs leading-relaxed font-medium">
                Implementação final do código, testes globais de velocidade nos servidores e publicação do domínio oficial (.com.br).
              </p>
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4 flex-wrap shadow-lg">
            <div className="flex items-center gap-3">
              <Clock className="text-cyan-400 w-6 h-6 shrink-0 filter drop-shadow-[0_0_4px_rgba(0,240,255,0.3)] animate-pulse" />
              <div>
                <h4 className="text-white text-xs font-black uppercase tracking-wider">Prazo de Entrega Estimado</h4>
                <p className="text-slate-300 text-xs font-medium">Apenas <strong className="text-cyan-400 font-bold">3 a 5 dias úteis</strong> após aprovação de layout e entrega dos materiais.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // Slide 8: Investimento
    {
      title: "INVESTIMENTO",
      subtitle: "Condição promocional exclusiva por tempo limitado",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-cyan-400 w-4 h-4 animate-bounce" />
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/50 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Oportunidade Única do Mês
              </span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight font-display">Posicionamento Premium a Preço de Custo</h3>
            <p className="text-slate-300 text-sm leading-relaxed font-medium">
              Liberamos uma campanha promocional para as primeiras <strong className="text-cyan-400 font-bold">10 clínicas contratantes</strong> do mês.
            </p>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 font-medium">
              ⚠️ Restam apenas <strong className="text-cyan-400 font-bold">{clientData.spotsLeft} vagas</strong> com este valor promocional.
            </div>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/20 p-6 rounded-2xl relative shadow-[0_0_30px_rgba(0,240,255,0.12)]">
            <div className="absolute -top-3 right-4 bg-emerald-500 text-slate-950 text-[9px] font-black px-3.5 py-1 rounded uppercase tracking-widest shadow-md">
              Desconto Ativado
            </div>
            
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Investimento Único</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xs text-slate-500 line-through font-bold">R$ 1.500,00</span>
              <span className="text-3xl font-black text-white tracking-tight font-display">{formatCurrency(clientData.price)}</span>
            </div>
            
            <div className="border-t border-slate-800/80 my-4 pt-4 space-y-2">
              <h4 className="text-xs text-white font-black uppercase tracking-wider">Forma de Pagamento Facilitada:</h4>
              <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                <div className="bg-slate-955 p-2.5 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Sinal Inicial (50%)</span>
                  <span className="block text-white font-black mt-1 text-sm font-mono">{formatCurrency(clientData.price / 2)}</span>
                </div>
                <div className="bg-slate-955 p-2.5 rounded-xl border border-slate-900">
                  <span className="block text-[10px] text-slate-500 font-medium">Entrega Final (50%)</span>
                  <span className="block text-white font-black mt-1 text-sm font-mono">{formatCurrency(clientData.price / 2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    // Slide 9: Regras
    {
      title: "TERMOS E REGRAS",
      subtitle: "Transparência total desde o primeiro contato",
      content: (
        <div className="space-y-4 py-2 text-xs">
          <p className="text-slate-300 font-medium">
            Para garantir uma parceria saudável e produtiva, listamos abaixo nossos termos simples:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-1.5 shadow-md">
              <h4 className="text-white font-black flex items-center gap-2 font-display">
                <Globe className="w-4 h-4 text-cyan-400" /> Domínio & Hospedagem
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px] font-medium">
                A contratação do domínio e hospedagem é de responsabilidade do cliente. Nós fazemos toda a configuração gratuitamente.
              </p>
            </div>

            <div className="bg-slate-955 p-4 rounded-xl border border-slate-900 space-y-1.5 shadow-md">
              <h4 className="text-white font-black flex items-center gap-2 font-display">
                <Settings className="w-4 h-4 text-cyan-400" /> Manutenção & Garantias
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px] font-medium">
                Você terá 30 dias de garantia com suporte para correções de textos. Ajustes complexos posteriores serão orçadas à parte.
              </p>
            </div>
            
            <div className="bg-slate-955 p-4 rounded-xl border border-slate-900 space-y-1.5 shadow-md">
              <h4 className="text-white font-black flex items-center gap-2 font-display">
                <Layers2 className="w-4 h-4 text-cyan-400" /> Entrega dos Ativos
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px] font-medium">
                O cumprimento do prazo está condicionado ao envio dos materiais. Atrasos do cliente suspendem o prazo de entrega.
              </p>
            </div>

            <div className="bg-slate-955 p-4 rounded-xl border border-slate-900 space-y-1.5 shadow-md">
              <h4 className="text-white font-black flex items-center gap-2 font-display">
                <Zap className="w-4 h-4 text-cyan-400" /> Desempenho Garantido
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px] font-medium">
                Garantimos velocidade acima de 90 pontos no Lighthouse móvel no momento da entrega do site.
              </p>
            </div>
          </div>
        </div>
      )
    },
    // Slide 10: Aceite & Máquina de Vendas PIX FloriBank
    {
      title: "PRÓXIMOS PASSOS",
      subtitle: "Garanta seu posicionamento premium hoje mesmo",
      content: (
        <div className="flex flex-col items-center justify-center py-2 text-center relative">
          {signatureApproved && <ConfettiEffect />}
          
          <div className="bg-slate-900/80 border border-cyan-500/20 p-6 rounded-2xl max-w-lg w-full shadow-2xl backdrop-blur-sm relative overflow-hidden z-10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
            
            {isLoadingPayment ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <p className="text-sm font-bold text-slate-300 font-display">Gerando PIX Oficial FloriBank...</p>
                <p className="text-xs text-slate-500">Aguardando confirmação do gateway financeiro</p>
              </div>
            ) : !signatureApproved ? (
              <>
                <h3 className="text-xl font-black text-white mb-2 tracking-tight font-display flex items-center justify-center gap-2">
                  <FileCheck className="w-5 h-5 text-cyan-400" /> Assinatura Digital do Contrato
                </h3>
                
                <p className="text-slate-400 text-xs leading-relaxed mb-6 font-medium">
                  Para aceitar esta proposta e gerar a cobrança de entrada para início do projeto ({formatCurrency(clientData.price / 2)}), digite seu nome e confirme abaixo:
                </p>

                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">Nome Completo do Responsável:</label>
                    <input 
                      type="text" 
                      value={signatureName}
                      onChange={(e) => setSignatureName(e.target.value)}
                      placeholder="Ex: Dr. Roberto Bett"
                      className="w-full bg-slate-950 text-white border border-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 text-xs transition-all shadow-inner font-semibold"
                    />
                  </div>
                  <button 
                    onClick={handleClientAccept}
                    disabled={signatureName.trim().length <= 3}
                    className="w-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-slate-950 font-black p-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
                  >
                    Confirmar Aceite & Gerar Faturamento PIX
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-1.5 text-emerald-400">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                    {paymentStatus === 'PAID' ? <Zap className="w-6 h-6 animate-pulse" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <span className="text-sm font-black uppercase tracking-wider font-display">
                    {paymentStatus === 'PAID' ? 'Sinal Pago - Contrato Ativado! 🚀' : 'Proposta Assinada com Sucesso!'}
                  </span>
                  <p className="text-[9px] text-slate-400">Assinado digitalmente por <strong className="text-white">{signatureName}</strong></p>
                </div>

                <div className="w-full h-[1px] bg-slate-800/80 my-1"></div>

                {paymentStatus === 'PAID' ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/35 p-6 rounded-xl text-center space-y-3">
                    <p className="text-xs text-emerald-400 font-extrabold uppercase tracking-widest">Pagamento Confirmado no FloriBank!</p>
                    <p className="text-slate-300 text-xs leading-relaxed">Nossos engenheiros já foram notificados da aprovação financeira de <strong>{formatCurrency(clientData.price / 2)}</strong>. O kick-off do projeto foi disparado com sucesso!</p>
                    
                    <a 
                      href={`https://api.whatsapp.com/send?phone=5548991234567&text=Olá Cyborg! Realizei a assinatura e o pagamento do sinal no valor de ${formatCurrency(clientData.price / 2)} da ${encodeURIComponent(clientData.clinicName)}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black p-3.5 rounded-xl text-xs uppercase tracking-widest shadow-md transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" /> Entrar no Grupo do Projeto
                    </a>
                  </div>
                ) : (
                  <>
                    {/* QR Code & Copia e Cola Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-900 text-left">
                      <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-lg shrink-0">
                        {pixQrCodeUrl ? (
                          <img 
                            src={pixQrCodeUrl} 
                            alt="FloriBank PIX QR Code" 
                            className="w-40 h-40"
                          />
                        ) : (
                          <div className="w-40 h-40 flex items-center justify-center bg-slate-100 text-slate-500 text-xs">Erro no QR Code</div>
                        )}
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase mt-1">Escaneie o PIX</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="border-l-2 border-cyan-400 pl-2">
                          <span className="block text-[10px] text-slate-500 font-black uppercase">Valor do Sinal (50%)</span>
                          <span className="block text-lg font-black text-white font-mono">{formatCurrency(clientData.price / 2)}</span>
                        </div>

                        <p className="text-[9px] text-slate-400 leading-relaxed font-semibold">
                          Aguardando liquidação do Pix no FloriBank... A página atualizará automaticamente após o pagamento.
                        </p>

                        <button 
                          onClick={copyPixKey}
                          className={`w-full text-[10px] font-black uppercase p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${copiedPix ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                        >
                          {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPix ? 'Chave Copiada!' : 'Copiar PIX Copia e Cola'}
                        </button>

                        <button 
                          onClick={checkPaymentStatus}
                          disabled={checkingPayment}
                          className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white font-bold p-2.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {checkingPayment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3 text-cyan-400" />}
                          Verificar Pagamento Manualmente
                        </button>
                      </div>
                    </div>

                    {/* Onboarding Checklist */}
                    <div className="bg-slate-955 p-3.5 rounded-xl border border-slate-900/60 text-left space-y-2 text-[11px]">
                      <h4 className="text-[9px] text-cyan-400 font-black uppercase tracking-wider">Próximos Passos:</h4>
                      <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div> Faça o pagamento de sinal de 50%.</div>
                      <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div> Separe fotos da clínica e logo em alta resolução.</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }
  ];

  const handleNextSlide = () => {
    if (activeSlide < slides.length - 1) {
      setActiveSlide(activeSlide + 1);
    }
  };

  const handlePrevSlide = () => {
    if (activeSlide > 0) {
      setActiveSlide(activeSlide - 1);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative font-sans">
      
      {/* Background cyber grid effect */}
      <div className="absolute inset-0 bg-cyber-grid pointer-events-none opacity-40 z-0"></div>
      
      {/* Decorative gradient glowing spheres */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Copied URL Toast Notification */}
      {showCopiedToast && (
        <div className="fixed top-5 right-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs px-6 py-3.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-bounce border border-cyan-400/30">
          <Share2 className="w-4 h-4" /> LINK DA PROPOSTA COPIADO!
        </div>
      )}

      {/* Dynamic style sheet for print styling overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            background-color: #020617 !important;
            color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside, .screen-only, button, .top-bar-controls {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            background: none !important;
          }
          .print-layout {
            display: block !important;
          }
          .interactive-deck-view {
            display: none !important;
          }
          .print-slide-page {
            page-break-after: always;
            break-after: page;
            min-height: 100vh;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            padding: 3rem !important;
            box-sizing: border-box;
            background-color: #020617 !important;
            color: #f8fafc !important;
          }
        }
      `}} />

      {/* 1. Interactive Sidebar (Cyborg Admin Panel - Rendered ONLY in admin path) */}
      {showConfig && isAdminMode && (
        <aside className="w-full md:w-96 bg-slate-955/80 border-r border-slate-800/80 p-6 flex flex-col gap-6 shrink-0 z-20 overflow-y-auto max-h-screen md:max-h-none shadow-2xl backdrop-blur-md">
          <div className="flex flex-col gap-2 border-b border-slate-800/60 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-black">
                <Settings className="w-5 h-5 animate-spin-slow" />
                <span className="text-xs uppercase tracking-widest font-black font-display">Painel de Customização</span>
              </div>
            </div>

            {/* Sub-menu Tabs for Admin */}
            <div className="flex gap-2 mt-4 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button 
                onClick={() => setAdminTab('editor')}
                className={`flex-1 text-[10px] uppercase font-black py-2 rounded-md transition-all cursor-pointer ${adminTab === 'editor' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Orçamentos
              </button>
              <button 
                onClick={() => setAdminTab('crm')}
                className={`flex-1 text-[10px] uppercase font-black py-2 rounded-md transition-all cursor-pointer ${adminTab === 'crm' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Funil CRM
              </button>
            </div>
          </div>

          {adminTab === 'editor' ? (
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Nome da Clínica / Cliente</label>
                <input 
                  type="text" 
                  name="clinicName" 
                  value={clientData.clinicName} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 p-2.5 rounded-xl text-xs text-white focus:outline-none transition-all font-semibold shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Responsável / Doutor(a)</label>
                <input 
                  type="text" 
                  name="representative" 
                  value={clientData.representative} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 p-2.5 rounded-xl text-xs text-white focus:outline-none transition-all font-semibold shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">E-mail</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={clientData.email} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Telefone Contato</label>
                  <input 
                    type="text" 
                    name="phone" 
                    value={clientData.phone} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">CNPJ / CPF</label>
                  <input 
                    type="text" 
                    name="cnpj" 
                    value={clientData.cnpj} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Cidade / UF</label>
                  <input 
                    type="text" 
                    name="city" 
                    value={clientData.city} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Endereço Comercial</label>
                <input 
                  type="text" 
                  name="address" 
                  value={clientData.address} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">URL do Pré-Site Temporário</label>
                <input 
                  type="text" 
                  name="preSiteUrl" 
                  value={clientData.preSiteUrl} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Preço Promocional (R$)</label>
                  <input 
                    type="number" 
                    name="price" 
                    value={clientData.price} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Vagas Restantes</label>
                  <input 
                    type="number" 
                    name="spotsLeft" 
                    value={clientData.spotsLeft} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-1">Chave PIX Recebimento</label>
                <input 
                  type="text" 
                  name="pixKey" 
                  value={clientData.pixKey} 
                  onChange={handleInputChange}
                  placeholder="E-mail ou CNPJ"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 p-2.5 rounded-xl text-xs text-white focus:outline-none font-semibold"
                />
              </div>
              
              <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
                <button 
                  onClick={handleSaveProposal}
                  className={`w-full font-black p-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${saveStatus === 'success' ? 'bg-emerald-500 text-slate-950' : saveStatus === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white'}`}
                >
                  <FileText className="w-4 h-4" />
                  {saveStatus === 'saving' ? 'Salvando...' : saveStatus === 'success' ? 'Proposta Salva!' : saveStatus === 'error' ? 'Erro ao Salvar' : 'Salvar Proposta'}
                </button>
                
                <button 
                  onClick={copyToClipboard}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black p-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] uppercase tracking-widest cursor-pointer"
                >
                  <Share2 className="w-4 h-4" /> Salvar & Copiar Link
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">CRM de Contratos</h4>
                <button onClick={fetchProposals} className="text-[9px] bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300 font-bold hover:text-white cursor-pointer">Atualizar</button>
              </div>
              
              <div className="space-y-3">
                {proposalsList.map((p) => (
                  <div key={p.id} className="bg-slate-900/90 border border-slate-800/80 p-3.5 rounded-xl relative overflow-hidden group">
                    <span className={`absolute top-2 right-2 text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${p.status === 'aprovada' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : p.status === 'entregue' ? 'bg-blue-950 text-blue-400 border border-blue-900' : 'bg-slate-955 text-slate-400 border border-slate-850'}`}>
                      {p.status}
                    </span>
                    
                    <h5 className="text-xs font-black text-white pr-14 truncate font-display">{p.empresa_nome}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.cliente_nome}</p>
                    
                    <div className="mt-2.5 flex justify-between items-center border-t border-slate-850/60 pt-2 text-[9px] text-slate-500 font-bold">
                      <span className="text-cyan-400 font-semibold">{formatCurrency(Number(p.preco))}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setClientData({
                              id: p.id,
                              clinicName: p.empresa_nome,
                              representative: p.cliente_nome,
                              cnpj: p.cnpj || '',
                              address: p.endereco || '',
                              city: p.cidade || '',
                              phone: p.telefone || '',
                              email: p.email || '',
                              preSiteUrl: p.url_presite || '',
                              price: Number(p.preco),
                              spotsLeft: p.vagas_restantes || 4,
                              pixKey: p.chave_pix || 'financeiro@cyborgsolutions.com.br'
                            });
                            setAdminTab('editor');
                          }}
                          className="text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                          title="Editar Proposta"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => {
                            const link = generateShareableLink(p.id);
                            navigator.clipboard.writeText(link);
                            alert("Link da proposta copiado!");
                          }}
                          className="text-slate-400 hover:text-white cursor-pointer"
                          title="Copiar Link"
                        >
                          <Share2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProposal(p.id)}
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                          title="Deletar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* 2. Main Workspace Layout */}
      {isAdminMode && adminTab === 'crm' ? (
        <main className="flex-1 p-6 md:p-10 flex flex-col gap-6 z-10 overflow-y-auto max-h-screen">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest font-mono">CYBORG CRM CONTRATOS</span>
              <h1 className="text-2xl font-black text-white font-display mt-1">Funil de Vendas & Faturamento</h1>
            </div>
            <button 
              onClick={() => {
                setClientData({
                  id: "",
                  clinicName: "Nova Clínica",
                  representative: "",
                  cnpj: "",
                  address: "",
                  city: "",
                  phone: "",
                  email: "",
                  preSiteUrl: "https://",
                  price: 497.00,
                  spotsLeft: 4,
                  pixKey: "financeiro@cyborgsolutions.com.br"
                });
                setAdminTab('editor');
              }}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.25)]"
            >
              <Plus className="w-4 h-4" /> Novo Orçamento
            </button>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
            {[
              { id: 'criada', name: 'Criadas', border: 'border-slate-800', text: 'text-slate-400', bg: 'bg-slate-900/40' },
              { id: 'enviada', name: 'Enviadas', border: 'border-cyan-500/20', text: 'text-cyan-400', bg: 'bg-cyan-950/5' },
              { id: 'aguardando_aprovacao', name: 'Aguardando', border: 'border-yellow-500/30', text: 'text-yellow-400', bg: 'bg-yellow-950/5' },
              { id: 'aprovada', name: 'Aprovadas / Assinadas', border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-950/5' },
              { id: 'entregue', name: 'Entregues', border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-950/5' }
            ].map((col) => {
              const colProposals = proposalsList.filter(p => p.status === col.id);
              return (
                <div key={col.id} className={`${col.bg} border ${col.border} rounded-2xl p-3 flex flex-col gap-3 min-h-[400px]`}>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <span className={`text-[11px] font-black uppercase tracking-wider ${col.text} font-display`}>{col.name}</span>
                    <span className="text-[10px] bg-slate-955/80 px-2 py-0.5 rounded-md text-slate-400 font-mono font-bold">{colProposals.length}</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                    {colProposals.map((p) => (
                      <div key={p.id} className="bg-slate-950/80 border border-slate-900 hover:border-slate-800/80 p-3.5 rounded-xl space-y-3 transition-colors shadow-lg">
                        <div>
                          <h4 className="text-xs font-black text-white font-display truncate">{p.empresa_nome}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{p.cliente_nome}</span>
                        </div>

                        <div className="space-y-1 text-[10px] text-slate-500 font-medium">
                          {p.telefone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-600" /> {p.telefone}</p>}
                          {p.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-600" /> {p.email}</p>}
                          <p className="flex items-center gap-1.5 font-bold text-cyan-400/80 mt-1"><DollarSign className="w-3.5 h-3.5 text-cyan-500" /> Valor: {formatCurrency(Number(p.preco))}</p>
                        </div>

                        {p.assinatura_nome && (
                          <div className="bg-slate-900/60 p-2 rounded-lg text-[9px] text-slate-400 border border-slate-850">
                            <span className="block font-bold text-slate-300">Assinado por: {p.assinatura_nome}</span>
                            <span className="block text-[8px] text-slate-500 mt-0.5">Em: {p.assinatura_data ? new Date(p.assinatura_data).toLocaleDateString('pt-BR') : ''}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center border-t border-slate-900 pt-2">
                          <button 
                            onClick={() => handleDeleteProposal(p.id)}
                            className="text-red-500/70 hover:text-red-400 p-1 cursor-pointer"
                            title="Deletar Proposta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="flex gap-1">
                            {col.id !== 'criada' && (
                              <button 
                                onClick={() => {
                                  const stages = ['criada', 'enviada', 'aguardando_aprovacao', 'aprovada', 'entregue'];
                                  const idx = stages.indexOf(col.id);
                                  handleUpdateStatus(p.id, stages[idx - 1]);
                                }}
                                className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Voltar
                              </button>
                            )}
                            {col.id !== 'entregue' && (
                              <button 
                                onClick={() => {
                                  const stages = ['criada', 'enviada', 'aguardando_aprovacao', 'aprovada', 'entregue'];
                                  const idx = stages.indexOf(col.id);
                                  handleUpdateStatus(p.id, stages[idx + 1]);
                                }}
                                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded cursor-pointer"
                              >
                                Avançar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        /* Regular Deck View for proposal slides */
        <main className="flex-1 flex flex-col justify-between p-4 md:p-10 relative interactive-deck-view z-10">
          {/* Top Toolbar */}
          <div className="flex justify-between items-center mb-6 z-10 top-bar-controls">
            <div className="flex items-center gap-3">
              {!showConfig && isAdminMode && (
                <button 
                  onClick={() => setShowConfig(true)}
                  className="bg-slate-900/90 hover:bg-slate-855 border border-slate-800/80 p-2.5 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg flex items-center gap-1.5 text-xs font-bold font-display cursor-pointer"
                  title="Abrir Editor"
                >
                  <Settings className="w-4 h-4 animate-spin-slow" />
                  <span>Configurar</span>
                </button>
              )}
              <div>
                <span className="text-[9px] text-cyan-400 font-black uppercase tracking-widest bg-cyan-950/30 px-3 py-1 rounded-md border border-cyan-900/20 shadow-inner font-mono">
                  PROPOSTA DIGITAL DE ALTA PERFORMANCE
                </span>
                <h1 className="text-sm font-black text-slate-400 truncate max-w-[200px] md:max-w-none mt-2 uppercase tracking-wide">
                  Cyborg Solutions &times; <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 font-extrabold">{clientData.clinicName}</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdminMode && (
                <button 
                  onClick={copyToClipboard}
                  className="bg-emerald-955/40 hover:bg-emerald-955 border border-emerald-800/50 text-emerald-400 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
                  title="Copiar Link"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden md:inline">Copiar Link</span>
                </button>
              )}
              <button 
                onClick={triggerPrint}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] uppercase tracking-wider cursor-pointer"
              >
                <Download className="w-4 h-4" /> PDF
              </button>
              <div className="text-xs text-slate-400 font-extrabold bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-800/80 shadow-md font-mono">
                <span className="text-cyan-400">{activeSlide + 1}</span> <span className="text-slate-700">/</span> <span className="text-slate-500">{slides.length}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Content Slide Display Box */}
          <div className="flex-1 flex flex-col justify-center max-w-4xl w-full mx-auto my-auto z-10">
            <div className="cyber-glass rounded-2xl md:rounded-3xl p-5 md:p-12 shadow-[0_30px_70px_rgba(0,0,0,0.5)] min-h-[460px] md:min-h-[540px] flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(0,240,255,0.8)]"></div>
              
              <div>
                <div className="mb-4">
                  <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-black block font-mono">Slide 0{activeSlide + 1}</span>
                  <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mt-1 font-display">{slides[activeSlide].title}</h2>
                  <p className="text-xs md:text-sm text-slate-400 mt-1 font-semibold">{slides[activeSlide].subtitle}</p>
                  <div className="w-full h-[1px] bg-gradient-to-r from-cyan-500/20 via-slate-850 to-transparent mt-4"></div>
                </div>

                <div className="mt-6 transition-all duration-300">
                  {slides[activeSlide].content}
                </div>
              </div>

              <div className="flex justify-center gap-2 mt-8 border-t border-slate-800/20 pt-5">
                {slides.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-1 rounded-full transition-all duration-350 cursor-pointer ${activeSlide === idx ? 'w-10 bg-cyan-400' : 'w-3.5 bg-slate-800 hover:bg-slate-700'}`}
                    title={`Ir para Slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Slide Navigation Footer Control */}
          <div className="flex justify-between items-center max-w-4xl w-full mx-auto mt-6 z-10 pt-4 border-t border-slate-900/50">
            <button 
              onClick={handlePrevSlide}
              disabled={activeSlide === 0}
              className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-855 disabled:opacity-30 disabled:hover:bg-slate-900/90 text-slate-300 px-5 py-3 rounded-xl border border-slate-800/80 text-xs font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>

            <div className="hidden md:flex gap-1.5 items-center font-mono">
              <span className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider">Use as setas ← → do teclado</span>
            </div>

            {activeSlide === slides.length - 1 ? (
              <button 
                onClick={() => {
                  setActiveSlide(0);
                  setSignatureApproved(false);
                  setSignatureName("");
                }}
                className="flex items-center gap-2 bg-cyan-950/60 hover:bg-cyan-950 text-cyan-400 px-6 py-3 rounded-xl border border-cyan-800/30 text-xs font-black transition-all uppercase tracking-widest font-display cursor-pointer"
              >
                Reiniciar Proposta
              </button>
            ) : (
              <button 
                onClick={handleNextSlide}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>
      )}

      {/* Keyboard navigation hook */}
      <KeyboardNavigator activeSlide={activeSlide} onPrev={handlePrevSlide} onNext={handleNextSlide} totalSlides={slides.length} />
    </div>
  );
}

// Subcomponent to listen to keyboard navigation arrows
interface KeyboardNavigatorProps {
  activeSlide: number;
  onPrev: () => void;
  onNext: () => void;
  totalSlides: number;
}

function KeyboardNavigator({ activeSlide, onPrev, onNext, totalSlides }: KeyboardNavigatorProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        onPrev();
      } else if (e.key === "ArrowRight") {
        onNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlide, onPrev, onNext, totalSlides]);

  return null;
}

// Confetti Fallback Component for success moments
function ConfettiEffect() {
  const [particles] = useState(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${Math.random() * 2 + 2}s`,
      color: ['#00f0ff', '#0066ff', '#10b981', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 5)],
      size: `${Math.random() * 8 + 6}px`,
      shape: Math.random() > 0.5 ? 'rounded-full' : 'rounded-sm',
    }));
  });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map(p => (
        <div
          key={p.id}
          className={`absolute top-0 animate-fall ${p.shape}`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
}

