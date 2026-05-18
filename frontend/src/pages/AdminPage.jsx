import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  LogOut, FileText, MessageSquare, Building2, Recycle,
  Loader2, ChevronDown, ChevronUp, Clock, Phone, Mail,
  Download, Filter, Sparkles, MessageCircle, Save, Trash2, SendHorizontal, UserX, RefreshCw,
} from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_OPTIONS = [
  { value: 'nouveau',        label: 'Nouveau',         color: 'bg-rose-100 text-rose-700' },
  { value: 'en_attente',     label: 'En attente',      color: 'bg-orange-100 text-orange-700' },
  { value: 'pris_en_charge', label: 'Prise en charge', color: 'bg-blue-100 text-blue-700' },
  { value: 'cloture',        label: 'Clôture',         color: 'bg-[#E8F5EE] text-[#1A5C3A]' },
  { value: 'client_perdu',   label: 'Client perdu',    color: 'bg-red-100 text-red-600' },
];

const SOURCE_LABELS = {
  google: 'Google',
  reseaux_sociaux: 'Réseaux sociaux',
  bouche_a_oreille: 'Bouche à oreille',
  passage_magasin: 'En passant devant le magasin',
  autre: 'Autre',
};

const CONDITION_LABELS = {
  bon: 'Bon état',
  moyen: 'État moyen',
  abime: 'Abîmé',
};

const DEVICE_TYPE_LABELS = {
  smartphone: 'Smartphone',
  tablette: 'Tablette',
  pc: 'PC',
  electromenager: 'Électroménager',
  'velo-trottinette': 'Vélo / Trottinette',
  autre: 'Autre',
};

// Parse legacy RDV message blob (created by AppointmentPage before structured fields existed)
// Format example:
//   Type: smartphone
//   Marque: Apple
//   Modèle: iPhone 14
//   Panne: Écran cassé
//   Date: 2026-05-15
//   Créneau: Matin
//   <free text>
const parseRdvMessage = (msg) => {
  if (!msg || typeof msg !== 'string') return {};
  const lines = msg.split('\n');
  const out = {};
  const free = [];
  const map = { 'Type': 'device_type', 'Marque': 'brand', 'Modèle': 'model', 'Panne': 'issue', 'Date': 'date', 'Créneau': 'slot' };
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m && map[m[1].trim()]) {
      const v = m[2].trim();
      if (v && v !== '-') out[map[m[1].trim()]] = v;
    } else if (line.trim()) {
      free.push(line);
    }
  }
  out.free = free.join('\n').trim();
  return out;
};

const STORE_NAME_MAP = STORES.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});

const AdminPage = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('devis');
  const [storeFilter, setStoreFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState(null);
  const [showRattrapageModal, setShowRattrapageModal] = useState(false);
  const [rattrapageCode, setRattrapageCode] = useState('');
  const [rattrapageError, setRattrapageError] = useState('');
  const [rattrapageResult, setRattrapageResult] = useState(null);
  const [rattrapageLoading, setRattrapageLoading] = useState(false);
  const [data, setData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (token) {
      axios.get(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(() => { setIsLoggedIn(true); setLoading(false); })
        .catch(() => { localStorage.removeItem('admin_token'); setToken(''); setIsLoggedIn(false); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadStats = useCallback(async () => {
    try {
      const params = storeFilter ? { store: storeFilter } : {};
      const r = await axios.get(`${API_URL}/api/admin/stats`, { headers: authHeaders, params });
      setStats(r.data);
    } catch { setStats(null); }
  }, [storeFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (tab = activeTab) => {
    setDataLoading(true);
    try {
      const params = {};
      if (storeFilter) params.store = storeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const r = await axios.get(`${API_URL}/api/admin/demandes/${tab}`, { headers: authHeaders, params });
      setData(r.data);
    } catch { setData([]); }
    setDataLoading(false);
  }, [activeTab, storeFilter, dateFrom, dateTo, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoggedIn) {
      loadStats();
      loadData(activeTab);
    }
  }, [isLoggedIn, activeTab, storeFilter, dateFrom, dateTo, loadStats, loadData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const r = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const t = r.data.token;
      localStorage.setItem('admin_token', t);
      setToken(t);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err.response?.data?.detail || 'Erreur de connexion');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setIsLoggedIn(false);
  };

  const updateStatus = async (id, newStatus, lostReason) => {
    try {
      const payload = { status: newStatus };
      if (lostReason) payload.lost_reason = lostReason;
      await axios.patch(`${API_URL}/api/admin/demandes/${activeTab}/${id}/status`, payload, { headers: authHeaders });
      setData(prev => prev.map(d => d.id === id ? { ...d, status: newStatus, ...(lostReason ? { lost_reason: lostReason } : {}) } : d));
      loadStats();
    } catch (e) {
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const saveStaffFeedback = async (id, payload) => {
    await axios.patch(`${API_URL}/api/admin/demandes/${activeTab}/${id}/feedback`, payload, { headers: authHeaders });
    setData(prev => prev.map(d => d.id === id ? { ...d, ...payload } : d));
  };

  const handleDeleteDemand = async (id, code) => {
    await axios.delete(`${API_URL}/api/admin/demandes/${activeTab}/${id}`, { headers: authHeaders, data: { code } });
    setData(prev => prev.filter(d => d.id !== id));
    loadStats();
  };

  const handlePushWADemand = async (id, code) => {
    await axios.post(`${API_URL}/api/admin/demandes/${activeTab}/${id}/push-whatsapp`, { code }, { headers: authHeaders });
  };

  const handleRattrapage = async () => {
    setRattrapageLoading(true);
    setRattrapageError('');
    try {
      const r = await axios.post(`${API_URL}/api/admin/push-whatsapp/rattrapage`, { code: rattrapageCode }, { headers: authHeaders });
      setRattrapageResult(r.data);
    } catch (err) {
      setRattrapageError(err.response?.data?.detail || 'Erreur');
    }
    setRattrapageLoading(false);
  };

  const handleExportCSV = async () => {
    try {
      const params = {};
      if (storeFilter) params.store = storeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const r = await axios.get(`${API_URL}/api/admin/export-all`, {
        headers: authHeaders,
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `repairandco_tous_leads_${ts}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Erreur lors de l'export CSV");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#1A5C3A]" size={32} /></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#E8F5EE] flex items-center justify-center px-4" data-testid="admin-login">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-center mb-6 text-[#1A5C3A]">Admin Repair&Co</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" data-testid="admin-email" required />
              <Input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="form-input" data-testid="admin-password" required />
              {loginError && <p className="text-red-600 text-sm" data-testid="admin-login-error">{loginError}</p>}
              <Button type="submit" disabled={loginLoading} className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full" data-testid="admin-login-btn">
                {loginLoading ? <Loader2 className="animate-spin" size={18} /> : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'devis', label: 'Devis', icon: FileText, count: stats?.devis },
    { id: 'contact', label: 'Contact / RDV', icon: MessageSquare, count: stats?.contact },
    { id: 'entreprise', label: 'Entreprise', icon: Building2, count: stats?.entreprise },
    { id: 'rachat', label: 'Rachat', icon: Recycle, count: stats?.rachat },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-[#1A5C3A] text-white px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Admin — Repair&Co</h1>
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm hidden sm:inline" data-testid="admin-total-count">
              {stats?.total || 0} demandes · <span className="text-rose-300 font-semibold">{stats?.nouveau || 0} nouveau{(stats?.nouveau || 0) > 1 ? 'x' : ''}</span>
            </span>
            <button
              onClick={() => { setRattrapageCode(''); setRattrapageError(''); setRattrapageResult(null); setShowRattrapageModal(true); }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-xs text-white font-medium transition-colors"
              data-testid="admin-rattrapage-btn"
            >
              <RefreshCw size={13} /> Rattrapage
            </button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-white text-white hover:bg-white/10 rounded-full text-xs" data-testid="admin-logout">
              <LogOut size={14} className="mr-1" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-[#E8F5EE]">
          <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/70 flex-shrink-0">
            <Filter size={16} className="text-[#1A5C3A]" />
            <span className="font-medium">Magasin :</span>
          </div>
          <select
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
            className="px-3 py-1.5 border border-[#E8F5EE] rounded-lg text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71]"
            data-testid="admin-store-filter"
          >
            <option value="">Tous les magasins</option>
            {STORES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <DateRangePicker
            onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          />

          <Button
            onClick={handleExportCSV}
            className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full text-xs ml-auto"
            data-testid="admin-export-csv"
          >
            <Download size={14} className="mr-1" /> Exporter CSV
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-[#1A5C3A] text-white' : 'bg-white text-[#1A1A2E] hover:bg-[#E8F5EE] border border-[#E8F5EE]'
              }`}
              data-testid={`admin-tab-${t.id}`}
            >
              <t.icon size={16} />
              {t.label}
              {t.count !== undefined && <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === t.id ? 'bg-white/20' : 'bg-[#E8F5EE]'}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        {dataLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#1A5C3A]" size={32} /></div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-[#1A1A2E]/50" data-testid="admin-empty-state">Aucune demande dans cette catégorie.</div>
        ) : (
          <div className="space-y-3" data-testid="admin-demands-list">
            {data.map((item, idx) => (
              <DemandCard
                key={item.id || idx}
                item={item}
                type={activeTab}
                onStatusChange={updateStatus}
                onSaveStaffFeedback={saveStaffFeedback}
                onDelete={handleDeleteDemand}
                onPushWA={handlePushWADemand}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rattrapage modal */}
      <Dialog open={showRattrapageModal} onOpenChange={o => { setShowRattrapageModal(o); if (!o) { setRattrapageCode(''); setRattrapageResult(null); setRattrapageError(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A2E] flex items-center gap-2">
              <RefreshCw size={18} className="text-[#1A5C3A]" /> Rattrapage leads Nouveau
            </DialogTitle>
            <DialogDescription>
              Renvoie un WhatsApp au magasin pour <strong>tous les leads au statut "Nouveau"</strong>. Entrez le code de sécurité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {!rattrapageResult ? (
              <>
                <Input type="password" placeholder="Code de sécurité" value={rattrapageCode}
                  onChange={e => setRattrapageCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && rattrapageCode && handleRattrapage()}
                  autoFocus data-testid="rattrapage-code-input" />
                {rattrapageError && <p className="text-red-600 text-sm">{rattrapageError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowRattrapageModal(false)} className="text-xs rounded-full">Annuler</Button>
                  <Button onClick={handleRattrapage} disabled={rattrapageLoading || !rattrapageCode}
                    className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full" data-testid="rattrapage-confirm">
                    {rattrapageLoading ? <Loader2 className="animate-spin mr-1" size={14} /> : <RefreshCw size={14} className="mr-1" />}
                    Envoyer alertes
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-2 space-y-2">
                <p className="text-[#1A5C3A] font-semibold text-lg">{rattrapageResult.count} WhatsApp envoyé{rattrapageResult.count > 1 ? 's' : ''}</p>
                {rattrapageResult.details?.map((d, i) => (
                  <p key={i} className="text-xs text-[#1A1A2E]/70">{d.client} ({d.category})</p>
                ))}
                <Button onClick={() => setShowRattrapageModal(false)} className="mt-2 bg-[#1A5C3A] text-white rounded-full text-xs">Fermer</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DemandCard = ({ item, type, onStatusChange, onSaveStaffFeedback, onDelete, onPushWA }) => {
  const [open, setOpen] = useState(false);
  const feedbackRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [showRelanceMenu, setShowRelanceMenu] = useState(false);
  const relanceRef = useRef(null);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushCode, setPushCode] = useState('');
  const [pushError, setPushError] = useState('');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);

  // Close relance menu on outside click
  useEffect(() => {
    const handler = (e) => { if (relanceRef.current && !relanceRef.current.contains(e.target)) setShowRelanceMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const handleDeleteSubmit = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await onDelete(item.id, deleteCode);
      setShowDeleteModal(false);
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Code incorrect');
    }
    setDeleteLoading(false);
  };

  const handleLostSubmit = () => {
    if (!lostReason.trim()) return;
    onStatusChange(item.id, 'client_perdu', lostReason);
    setShowLostModal(false);
  };

  const handlePushSubmit = async () => {
    setPushLoading(true);
    setPushError('');
    try {
      await onPushWA(item.id, pushCode);
      setPushSuccess(true);
    } catch (err) {
      setPushError(err.response?.data?.detail || 'Code incorrect');
    }
    setPushLoading(false);
  };

  const getPrenom = () => item.first_name || (item.name || '').split(' ')[0] || '';
  const getAppareil = () => {
    const legacy = parseRdvMessage(item.message);
    return [item.rdv_brand || item.brand || legacy.brand, item.rdv_model || item.model || legacy.model].filter(Boolean).join(' ') || 'votre appareil';
  };
  const getStoreName = () => STORES.find(s => s.id === item.store)?.name || item.store || '';

  const handleRelanceEmail = () => {
    const prenom = getPrenom();
    const brand = item.rdv_brand || item.brand || '';
    const model = item.rdv_model || item.model || '';
    const panne = item.rdv_issue || (item.issue_types || []).join(', ') || '';
    const storeName = getStoreName();
    const subject = encodeURIComponent('Votre demande de réparation chez Repair & Co');
    const body = encodeURIComponent(
      `Bonjour ${prenom},\n\n` +
      `Merci pour votre demande concernant votre appareil "${brand}" "${model}" avec "${panne}".\n\n` +
      `Pour le traitement de cette réparation, faisant appel de la pièce XXXXXXXXX, le tarif est de [Tarif], auquel il faut déduire le bonus réparation de l'État de 25€, soit un reste à charge de [Reste à charge].\n\n` +
      `Et, bonne nouvelle, cette offre est également cumulable avec notre carte fidélité 😁 qui permet de vraiment alléger ce montant 💪🏻. En plus, elle donne droit à de nombreuses réductions et services.\n\n` +
      `Pour réaliser votre réparation, nos techniciens utiliseront tout leur savoir-faire et leur expérience. Votre appareil sera testé après réparation.\n\n` +
      `N'hésitez pas à revenir vers nous (Tel/WhatsApp : +33 4 66 84 80 79) ou passer directement en boutique pour la prise en charge, ou bien à prendre RDV directement ici 😊\n\n` +
      `Bon à savoir aussi 😉 : votre assurance de carte bancaire peut potentiellement vous aider sur le financement de la réparation et un paiement en 3 ou 4 fois vous sera proposé.\n\n` +
      `À très bientôt chez ${storeName},\n\n` +
      `[Prénom Technicien]\n` +
      `Responsable Atelier – Repair&Co`
    );
    window.open(`mailto:${item.email}?subject=${subject}&body=${body}`);
    setShowRelanceMenu(false);
  };

  const handleRelanceWA = () => {
    const prenom = getPrenom();
    const appareil = getAppareil();
    const phone = (item.phone || '').replace(/[\s\-().]/g, '').replace(/^0/, '33');
    const text = encodeURIComponent(`Bonjour ${prenom}, c'est l'équipe Repair & Co ! J'ai tenté de vous appeler pour votre ${appareil}. À quel moment puis-je vous rappeler ?`);
    window.open(`https://wa.me/${phone}?text=${text}`);
    setShowRelanceMenu(false);
  };

  const date = item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const currentStatus = STATUS_OPTIONS.find(s => s.value === (item.status || 'nouveau')) || STATUS_OPTIONS[0];
  const isClosed = (item.status || 'en_attente') === 'cloture';
  const hasCustomerSurvey = item.customer_source || item.customer_feedback;

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'client_perdu') {
      setLostReason('');
      setShowLostModal(true);
      return;
    }
    if (newStatus === 'cloture') {
      setOpen(true);
    }
    await onStatusChange(item.id, newStatus);
    if (newStatus === 'cloture') {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  };

  const getTitle = () => {
    // Affichage admin : priorité au NOM (name / last_name). Prénom réservé aux relances.
    const nom = item.name || item.last_name || item.first_name || '';

    if (type === 'devis') {
      const appareil = [item.brand, item.model].filter(Boolean).join(' ') || DEVICE_TYPE_LABELS[item.device_type] || item.device_type || '';
      return [nom, appareil].filter(Boolean).join(' / ');
    }
    if (type === 'contact') {
      const isRdv = (item.subject || '').startsWith('RDV') || item.rdv_device_type || item.rdv_brand;
      if (isRdv) {
        const legacy = parseRdvMessage(item.message);
        const appareil = [item.rdv_brand || legacy.brand, item.rdv_model || legacy.model].filter(Boolean).join(' ')
          || DEVICE_TYPE_LABELS[item.rdv_device_type || legacy.device_type] || '';
        const rdvDate = item.rdv_date || legacy.date || '';
        return [nom, appareil, rdvDate].filter(Boolean).join(' / ');
      }
      return [nom, item.subject || ''].filter(Boolean).join(' / ');
    }
    if (type === 'entreprise') {
      const nomEntreprise = item.last_name || item.first_name || '';
      return [nomEntreprise, item.company].filter(Boolean).join(' / ');
    }
    if (type === 'rachat') {
      const appareil = [item.brand, item.model].filter(Boolean).join(' ') || '';
      return [nom, appareil].filter(Boolean).join(' / ');
    }
    return nom || item.id;
  };

  const getDetails = () => {
    // Prénom/Nom adapté selon le type de formulaire
    const nameRows = type === 'entreprise'
      ? [{ label: 'Prénom', value: item.first_name }, { label: 'Nom', value: item.last_name }]
      : [{ label: 'Prénom', value: item.first_name }, { label: 'Nom', value: item.name }];

    if (type === 'devis') return [
      ...nameRows,
      { label: 'Appareil', value: DEVICE_TYPE_LABELS[item.device_type] || item.device_type },
      { label: 'Marque', value: item.brand },
      { label: 'Modèle', value: item.model },
      { label: 'Problèmes', value: item.issue_types?.join(', ') },
      { label: 'Autre', value: item.other_issue },
      { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
      { label: 'Créneau', value: item.preferred_time },
    ];
    if (type === 'contact') {
      const isRdv = (item.subject || '').startsWith('RDV') || item.rdv_device_type || item.rdv_brand || item.rdv_model;
      if (isRdv) {
        const legacy = parseRdvMessage(item.message);
        const deviceType = item.rdv_device_type || legacy.device_type;
        const brand = item.rdv_brand || legacy.brand;
        const model = item.rdv_model || legacy.model;
        const issue = item.rdv_issue || legacy.issue;
        const date = item.rdv_date || legacy.date;
        const slot = item.rdv_slot || legacy.slot;
        const freeMsg = item.rdv_device_type ? item.message : legacy.free;
        return [
          ...nameRows,
          { label: 'Objet', value: item.subject },
          { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
          { label: 'Type d\'appareil', value: DEVICE_TYPE_LABELS[deviceType] || deviceType },
          { label: 'Marque', value: brand },
          { label: 'Modèle', value: model },
          { label: 'Panne', value: issue },
          { label: 'Date du RDV', value: date },
          { label: 'Créneau', value: slot },
          { label: 'Message', value: freeMsg },
        ];
      }
      return [
        ...nameRows,
        { label: 'Objet', value: item.subject },
        { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
        { label: 'Message', value: item.message },
      ];
    }
    if (type === 'entreprise') return [
      ...nameRows,
      { label: 'Société', value: item.company },
      { label: 'Taille flotte', value: item.fleet_size },
      { label: 'Besoin', value: item.need_type },
      { label: 'Message', value: item.message },
    ];
    if (type === 'rachat') return [
      ...nameRows,
      { label: 'Marque', value: item.brand },
      { label: 'Modèle', value: item.model },
      { label: 'État', value: CONDITION_LABELS[item.condition] || item.condition },
      { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
    ];
    return [];
  };

  return (
    <Card className="bg-white border border-gray-100 hover:shadow-sm transition-shadow" data-testid={`demand-card-${item.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button onClick={() => setOpen(!open)} className="flex-1 flex items-center justify-between text-left min-w-0" data-testid={`demand-toggle-${item.id}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-[#1A1A2E] truncate">{getTitle()}</p>
                {hasCustomerSurvey && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#E8F5EE] text-[#1A5C3A]" data-testid={`survey-badge-${item.id}`}>
                    <Sparkles size={10} /> retour client
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#1A1A2E]/60">
                <span className="flex items-center gap-1"><Clock size={12} />{date}</span>
                {item.phone && <span className="flex items-center gap-1"><Phone size={12} />{item.phone}</span>}
                {item.email && <span className="flex items-center gap-1 truncate"><Mail size={12} />{item.email}</span>}
              </div>
            </div>
            {open ? <ChevronUp size={20} className="text-[#1A5C3A] flex-shrink-0 ml-2" /> : <ChevronDown size={20} className="text-[#1A1A2E]/40 flex-shrink-0 ml-2" />}
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full font-medium hidden sm:inline ${currentStatus.color}`} data-testid={`demand-status-badge-${item.id}`}>
              {currentStatus.label}
            </span>
            <select
              value={item.status || 'en_attente'}
              onChange={e => handleStatusChange(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="px-2 py-1.5 border border-[#E8F5EE] rounded-lg text-xs text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71]"
              data-testid={`demand-status-select-${item.id}`}
            >
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button
              onClick={e => { e.stopPropagation(); setPushCode(''); setPushError(''); setPushSuccess(false); setShowPushModal(true); }}
              className="p-1.5 rounded text-gray-300 hover:text-[#2ECC71] hover:bg-[#E8F5EE] transition-colors"
              title="Push WhatsApp magasin"
              data-testid={`demand-push-${item.id}`}
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setDeleteCode(''); setDeleteError(''); setShowDeleteModal(true); }}
              className="p-1.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              title="Supprimer"
              data-testid={`demand-delete-${item.id}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {open && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {getDetails().filter(d => d.value).map(d => (
                <div key={d.label}>
                  <p className="text-xs font-medium text-[#1A5C3A]">{d.label}</p>
                  <p className="text-sm text-[#1A1A2E] whitespace-pre-line break-words">{d.value}</p>
                </div>
              ))}
            </div>

            {/* Customer survey */}
            {hasCustomerSurvey && (
              <div className="p-3 rounded-xl bg-[#E8F5EE]/60 border border-[#E8F5EE]" data-testid={`customer-survey-${item.id}`}>
                <div className="flex items-center gap-2 text-[#1A5C3A] mb-2">
                  <Sparkles size={14} />
                  <p className="text-xs font-semibold uppercase tracking-wide">Retour du client (mini-enquête)</p>
                </div>
                {item.customer_source && (
                  <p className="text-sm text-[#1A1A2E] mb-1">
                    <span className="font-medium">Comment nous a-t-il connus :</span> {SOURCE_LABELS[item.customer_source] || item.customer_source}
                  </p>
                )}
                {item.customer_feedback && (
                  <p className="text-sm text-[#1A1A2E] whitespace-pre-line">
                    <span className="font-medium">Point à améliorer :</span> {item.customer_feedback}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {item.phone && <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5EE] rounded-full text-xs text-[#1A5C3A] font-medium hover:bg-[#2ECC71]/20" data-testid={`demand-call-${item.id}`}><Phone size={12} />Appeler</a>}
              {/* Relancer button */}
              {(item.phone || item.email) && (
                <div className="relative" ref={relanceRef}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowRelanceMenu(!showRelanceMenu); }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A5C3A] rounded-full text-xs text-white font-medium hover:bg-[#2ECC71] transition-colors"
                    data-testid={`demand-relance-${item.id}`}
                  >
                    <SendHorizontal size={12} /> Relancer
                  </button>
                  {showRelanceMenu && (
                    <div className="absolute left-0 bottom-full mb-1 bg-white shadow-xl rounded-xl border border-[#E8F5EE] z-40 min-w-[150px] py-1">
                      {item.email && (
                        <button onClick={handleRelanceEmail} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-[#E8F5EE] text-[#1A1A2E]">
                          <Mail size={13} className="text-[#1A5C3A]" /> Email
                        </button>
                      )}
                      {item.phone && (
                        <button onClick={handleRelanceWA} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-[#E8F5EE] text-[#1A1A2E]">
                          <MessageCircle size={13} className="text-[#2ECC71]" /> WhatsApp
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {item.email && <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5EE] rounded-full text-xs text-[#1A5C3A] font-medium hover:bg-[#2ECC71]/20" data-testid={`demand-email-${item.id}`}><Mail size={12} />Email</a>}
            </div>

            {/* Raison perte client */}
            {item.lost_reason && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1"><UserX size={12} /> Raison perte client</p>
                <p className="text-sm text-red-700">{item.lost_reason}</p>
              </div>
            )}

            {/* Staff feedback (visible inline once status = cloture) */}
            {isClosed && (
              <div ref={feedbackRef}>
                <StaffFeedbackForm item={item} onSave={onSaveStaffFeedback} />
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Push WhatsApp dialog */}
      <Dialog open={showPushModal} onOpenChange={o => { setShowPushModal(o); if (!o) { setPushCode(''); setPushSuccess(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A2E] flex items-center gap-2">
              <RefreshCw size={16} className="text-[#1A5C3A]" /> Push WhatsApp magasin
            </DialogTitle>
            <DialogDescription>
              Renvoie l'alerte WhatsApp au magasin pour cette demande. Entrez le code de sécurité.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {!pushSuccess ? (
              <>
                <Input type="password" placeholder="Code de sécurité" value={pushCode}
                  onChange={e => setPushCode(e.target.value)}
                  onKeyDown={async e => { if (e.key === 'Enter' && pushCode) await handlePushSubmit(); }}
                  autoFocus data-testid={`push-code-input-${item.id}`} />
                {pushError && <p className="text-red-600 text-sm">{pushError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowPushModal(false)} className="text-xs rounded-full">Annuler</Button>
                  <Button onClick={handlePushSubmit} disabled={pushLoading || !pushCode}
                    className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full" data-testid={`push-confirm-${item.id}`}>
                    {pushLoading ? <Loader2 className="animate-spin mr-1" size={14} /> : <RefreshCw size={14} className="mr-1" />}
                    Envoyer
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-[#1A5C3A] font-semibold">WhatsApp envoyé !</p>
                <Button onClick={() => setShowPushModal(false)} className="mt-3 bg-[#1A5C3A] text-white rounded-full text-xs">Fermer</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Client perdu — modale de raison obligatoire */}
      <Dialog open={showLostModal} onOpenChange={o => { setShowLostModal(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A2E] flex items-center gap-2">
              <UserX size={18} className="text-red-500" /> Client perdu
            </DialogTitle>
            <DialogDescription>
              Indiquez la raison pour laquelle ce client est perdu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <textarea
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              placeholder="Ex : Prix trop élevé, a trouvé moins cher, ne répond plus..."
              rows={3}
              className="form-textarea w-full text-sm"
              autoFocus
              data-testid="lost-reason-input"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLostModal(false)} className="text-xs rounded-full">
                Annuler
              </Button>
              <Button
                onClick={handleLostSubmit}
                disabled={!lostReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-full"
                data-testid="lost-reason-confirm"
              >
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteModal} onOpenChange={o => { setShowDeleteModal(o); if (!o) setDeleteCode(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A2E]">Supprimer cette demande</DialogTitle>
            <DialogDescription>
              Entrez le code de sécurité pour confirmer la suppression définitive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              type="password"
              placeholder="Code de sécurité"
              value={deleteCode}
              onChange={e => setDeleteCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && deleteCode && handleDeleteSubmit()}
              className="form-input"
              autoFocus
              data-testid={`delete-code-input-${item.id}`}
            />
            {deleteError && (
              <p className="text-red-600 text-sm" data-testid={`delete-error-${item.id}`}>{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="text-xs rounded-full">
                Annuler
              </Button>
              <Button
                onClick={handleDeleteSubmit}
                disabled={deleteLoading || !deleteCode}
                className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-full"
                data-testid={`delete-confirm-${item.id}`}
              >
                {deleteLoading ? <Loader2 className="animate-spin mr-1" size={14} /> : <Trash2 size={14} className="mr-1" />}
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const StaffFeedbackForm = ({ item, onSave }) => {
  const [staffSource, setStaffSource] = useState(item.staff_source || '');
  const [staffOpinion, setStaffOpinion] = useState(item.staff_site_opinion || '');
  const [staffDislikes, setStaffDislikes] = useState(item.staff_dislikes || '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(item.id, {
        staff_source: staffSource.trim() || null,
        staff_site_opinion: staffOpinion.trim() || null,
        staff_dislikes: staffDislikes.trim() || null,
      });
      setSavedAt(Date.now());
    } catch {
      alert('Erreur lors de la sauvegarde du feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white border-2 border-[#2ECC71]/30" data-testid={`staff-feedback-${item.id}`}>
      <div className="flex items-center gap-2 text-[#1A5C3A] mb-3">
        <MessageCircle size={16} />
        <p className="text-sm font-semibold">Feedback équipe (à compléter en magasin)</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#1A1A2E] mb-1">Comment ils sont tombés sur nous ?</label>
          <textarea
            rows={2}
            value={staffSource}
            onChange={e => setStaffSource(e.target.value)}
            className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm focus:outline-none focus:border-[#2ECC71] resize-none"
            data-testid={`staff-source-${item.id}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1A1A2E] mb-1">Ce qu'ils ont pensé du site ?</label>
          <textarea
            rows={2}
            value={staffOpinion}
            onChange={e => setStaffOpinion(e.target.value)}
            className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm focus:outline-none focus:border-[#2ECC71] resize-none"
            data-testid={`staff-opinion-${item.id}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#1A1A2E] mb-1">Ce qu'ils n'ont pas forcément aimé / compris ?</label>
          <textarea
            rows={2}
            value={staffDislikes}
            onChange={e => setStaffDislikes(e.target.value)}
            className="w-full px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm focus:outline-none focus:border-[#2ECC71] resize-none"
            data-testid={`staff-dislikes-${item.id}`}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full text-xs"
            data-testid={`staff-save-${item.id}`}
          >
            {saving ? <Loader2 className="animate-spin mr-1" size={14} /> : <Save size={14} className="mr-1" />}
            Enregistrer le feedback
          </Button>
          {savedAt && (
            <span className="text-xs text-[#1A5C3A]" data-testid={`staff-saved-${item.id}`}>✓ Enregistré</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
