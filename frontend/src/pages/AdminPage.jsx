import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  LogOut, FileText, MessageSquare, Building2, Recycle,
  Loader2, ChevronDown, ChevronUp, Clock, Phone, Mail,
  Euro, Wrench, TrendingUp, Download, Filter,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_OPTIONS = [
  { value: 'nouveau', label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacte', label: 'Contacté', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rdv_fixe', label: 'RDV Fixé', color: 'bg-purple-100 text-purple-800' },
  { value: 'repare', label: 'Réparé', color: 'bg-[#E8F5EE] text-[#1A5C3A]' },
  { value: 'annule', label: 'Annulé', color: 'bg-red-100 text-red-800' },
];

const formatCurrency = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

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
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Validate token on mount
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
      const params = storeFilter ? { store: storeFilter } : {};
      const r = await axios.get(`${API_URL}/api/admin/demandes/${tab}`, { headers: authHeaders, params });
      setData(r.data);
    } catch { setData([]); }
    setDataLoading(false);
  }, [activeTab, storeFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoggedIn) {
      loadStats();
      loadData(activeTab);
    }
  }, [isLoggedIn, activeTab, storeFilter, loadStats, loadData]);

  const handleTabChange = (tab) => setActiveTab(tab);

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

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/api/admin/demandes/${activeTab}/${id}/status`, { status: newStatus }, { headers: authHeaders });
      setData(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
      loadStats();
    } catch (e) {
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const updateCA = async (id, newCA) => {
    try {
      await axios.patch(`${API_URL}/api/admin/demandes/${activeTab}/${id}/ca`, { ca: parseFloat(newCA) || 0 }, { headers: authHeaders });
      setData(prev => prev.map(d => d.id === id ? { ...d, ca: parseFloat(newCA) || 0 } : d));
      loadStats();
    } catch (e) {
      alert('Erreur lors de la mise à jour du CA');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = storeFilter ? { store: storeFilter } : {};
      const r = await axios.get(`${API_URL}/api/admin/demandes/${activeTab}/export`, {
        headers: authHeaders,
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([r.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `repairandco_${activeTab}_${ts}.csv`);
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
            <span className="text-white/80 text-sm hidden sm:inline" data-testid="admin-total-count">{stats?.total || 0} demandes</span>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-white text-white hover:bg-white/10 rounded-full text-xs" data-testid="admin-logout">
              <LogOut size={14} className="mr-1" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* KPI Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" data-testid="admin-kpi-banner">
          <KpiCard
            icon={Euro}
            label="CA total (Réparé)"
            value={formatCurrency(stats?.ca_total || 0)}
            tone="primary"
            testId="kpi-ca-total"
          />
          <KpiCard
            icon={Wrench}
            label="Réparations"
            value={stats?.reparations || 0}
            tone="accent"
            testId="kpi-reparations"
          />
          <KpiCard
            icon={TrendingUp}
            label="Panier moyen"
            value={formatCurrency(stats?.panier_moyen || 0)}
            tone="primary"
            testId="kpi-panier-moyen"
          />
          <KpiCard
            icon={FileText}
            label="Total demandes"
            value={stats?.total || 0}
            tone="muted"
            testId="kpi-total"
          />
        </div>

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-[#E8F5EE]">
          <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/70">
            <Filter size={16} className="text-[#1A5C3A]" />
            <span className="font-medium">Filtre magasin :</span>
          </div>
          <select
            value={storeFilter}
            onChange={e => setStoreFilter(e.target.value)}
            className="flex-1 sm:flex-none sm:min-w-[220px] px-3 py-2 border border-[#E8F5EE] rounded-lg text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71]"
            data-testid="admin-store-filter"
          >
            <option value="">Tous les magasins</option>
            {STORES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button
            onClick={handleExportCSV}
            className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full text-xs sm:ml-auto"
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
              onClick={() => handleTabChange(t.id)}
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
                onCAChange={updateCA}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, tone, testId }) => {
  const styles = {
    primary: 'bg-[#1A5C3A] text-white',
    accent: 'bg-[#2ECC71] text-white',
    muted: 'bg-white text-[#1A1A2E] border border-[#E8F5EE]',
  };
  return (
    <div className={`rounded-xl p-4 ${styles[tone] || styles.muted}`} data-testid={testId}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${tone === 'muted' ? 'text-[#1A1A2E]/60' : 'text-white/80'}`}>{label}</p>
        <Icon size={18} className={tone === 'muted' ? 'text-[#1A5C3A]' : 'text-white/90'} />
      </div>
      <p className="text-2xl font-bold mt-2 truncate">{value}</p>
    </div>
  );
};

const STORE_NAME_MAP = STORES.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});

const DemandCard = ({ item, type, onStatusChange, onCAChange }) => {
  const [open, setOpen] = useState(false);
  const [caValue, setCaValue] = useState(item.ca ?? 0);
  const [savingCA, setSavingCA] = useState(false);

  useEffect(() => { setCaValue(item.ca ?? 0); }, [item.ca]);

  const date = item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const statusOpt = STATUS_OPTIONS.find(s => s.value === (item.status || 'nouveau')) || STATUS_OPTIONS[0];

  const getTitle = () => {
    if (type === 'devis') return `${item.brand || ''} ${item.model || ''} — ${item.name || ''}`.trim();
    if (type === 'contact') return `${item.subject || ''} — ${item.name || ''}`.trim();
    if (type === 'entreprise') return `${item.company || ''} — ${item.first_name || ''} ${item.last_name || ''}`.trim();
    if (type === 'rachat') return `${item.brand || ''} ${item.model || ''} — ${item.name || ''}`.trim();
    return item.name || item.id;
  };

  const getDetails = () => {
    if (type === 'devis') return [
      { label: 'Appareil', value: item.device_type },
      { label: 'Marque', value: item.brand },
      { label: 'Modèle', value: item.model },
      { label: 'Problèmes', value: item.issue_types?.join(', ') },
      { label: 'Autre', value: item.other_issue },
      { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
      { label: 'Créneau', value: item.preferred_time },
    ];
    if (type === 'contact') return [
      { label: 'Objet', value: item.subject },
      { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
      { label: 'Message', value: item.message },
    ];
    if (type === 'entreprise') return [
      { label: 'Société', value: item.company },
      { label: 'Taille flotte', value: item.fleet_size },
      { label: 'Besoin', value: item.need_type },
      { label: 'Message', value: item.message },
    ];
    if (type === 'rachat') return [
      { label: 'Marque', value: item.brand },
      { label: 'Modèle', value: item.model },
      { label: 'État', value: item.condition },
      { label: 'Magasin', value: STORE_NAME_MAP[item.store] || item.store },
    ];
    return [];
  };

  const handleCABlur = async () => {
    if (parseFloat(caValue) === parseFloat(item.ca ?? 0)) return;
    setSavingCA(true);
    await onCAChange(item.id, caValue);
    setSavingCA(false);
  };

  return (
    <Card className="bg-white border border-gray-100 hover:shadow-sm transition-shadow" data-testid={`demand-card-${item.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button onClick={() => setOpen(!open)} className="flex-1 flex items-center justify-between text-left min-w-0" data-testid={`demand-toggle-${item.id}`}>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#1A1A2E] truncate">{getTitle()}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[#1A1A2E]/60">
                <span className="flex items-center gap-1"><Clock size={12} />{date}</span>
                {item.phone && <span className="flex items-center gap-1"><Phone size={12} />{item.phone}</span>}
                {item.email && <span className="flex items-center gap-1 truncate"><Mail size={12} />{item.email}</span>}
              </div>
            </div>
            {open ? <ChevronUp size={20} className="text-[#1A5C3A] flex-shrink-0 ml-2" /> : <ChevronDown size={20} className="text-[#1A1A2E]/40 flex-shrink-0 ml-2" />}
          </button>

          {/* Status + CA quick controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full font-medium hidden sm:inline ${statusOpt.color}`} data-testid={`demand-status-badge-${item.id}`}>
              {statusOpt.label}
            </span>
            <select
              value={item.status || 'nouveau'}
              onChange={e => onStatusChange(item.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              className="px-2 py-1.5 border border-[#E8F5EE] rounded-lg text-xs text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71]"
              data-testid={`demand-status-select-${item.id}`}
            >
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {item.status === 'repare' && (
              <div className="flex items-center gap-1 bg-[#E8F5EE] rounded-lg px-2 py-1" data-testid={`demand-ca-wrapper-${item.id}`}>
                <Euro size={12} className="text-[#1A5C3A]" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={caValue}
                  onChange={e => setCaValue(e.target.value)}
                  onBlur={handleCABlur}
                  onClick={e => e.stopPropagation()}
                  className="w-16 bg-transparent text-xs font-semibold text-[#1A5C3A] focus:outline-none"
                  data-testid={`demand-ca-input-${item.id}`}
                />
                {savingCA && <Loader2 size={10} className="animate-spin text-[#1A5C3A]" />}
              </div>
            )}
          </div>
        </div>

        {open && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
            {getDetails().filter(d => d.value).map(d => (
              <div key={d.label}>
                <p className="text-xs font-medium text-[#1A5C3A]">{d.label}</p>
                <p className="text-sm text-[#1A1A2E] whitespace-pre-line break-words">{d.value}</p>
              </div>
            ))}
            <div className="sm:col-span-2 flex flex-wrap gap-2 mt-2">
              {item.phone && <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5EE] rounded-full text-xs text-[#1A5C3A] font-medium hover:bg-[#2ECC71]/20" data-testid={`demand-call-${item.id}`}><Phone size={12} />Appeler</a>}
              {item.email && <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5EE] rounded-full text-xs text-[#1A5C3A] font-medium hover:bg-[#2ECC71]/20" data-testid={`demand-email-${item.id}`}><Mail size={12} />Email</a>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPage;
