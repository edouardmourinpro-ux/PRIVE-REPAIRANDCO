import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, FileText, MessageSquare, Building2, Recycle, 
  Loader2, ChevronDown, ChevronUp, Clock, Phone, Mail, MapPin
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminPage = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('devis');
  const [stats, setStats] = useState(null);
  const [data, setData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (isLoggedIn) {
      axios.get(`${API_URL}/api/admin/stats`, { headers: authHeaders }).then(r => setStats(r.data));
      loadTab('devis');
    }
  }, [isLoggedIn]);

  const loadTab = async (tab) => {
    setActiveTab(tab);
    setDataLoading(true);
    const endpoints = { devis: 'demandes-devis', contact: 'demandes-contact', entreprise: 'demandes-entreprise', rachat: 'demandes-rachat' };
    try {
      const r = await axios.get(`${API_URL}/api/admin/${endpoints[tab]}`, { headers: authHeaders });
      setData(r.data);
    } catch { setData([]); }
    setDataLoading(false);
  };

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#1A5C3A]" size={32} /></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#E8F5EE] flex items-center justify-center px-4" data-testid="admin-login">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-center mb-6">Admin Repair&Co</h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="form-input" data-testid="admin-email" required />
              <Input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="form-input" data-testid="admin-password" required />
              {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
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
          <div className="flex items-center gap-4">
            <span className="text-white/80 text-sm">{stats?.total || 0} demandes total</span>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-white text-white hover:bg-white/10 rounded-full text-xs" data-testid="admin-logout">
              <LogOut size={14} className="mr-1" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => loadTab(t.id)}
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
          <div className="text-center py-12 text-[#1A1A2E]/50">Aucune demande dans cette catégorie.</div>
        ) : (
          <div className="space-y-3">
            {data.map((item, idx) => (
              <DemandCard key={item.id || idx} item={item} type={activeTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DemandCard = ({ item, type }) => {
  const [open, setOpen] = useState(false);
  const date = item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const getTitle = () => {
    if (type === 'devis') return `${item.brand} ${item.model} — ${item.name}`;
    if (type === 'contact') return `${item.subject} — ${item.name}`;
    if (type === 'entreprise') return `${item.company} — ${item.first_name} ${item.last_name}`;
    if (type === 'rachat') return `${item.brand} ${item.model} — ${item.name}`;
    return item.name || item.id;
  };

  const getDetails = () => {
    if (type === 'devis') return [
      { label: 'Appareil', value: item.device_type },
      { label: 'Marque', value: item.brand },
      { label: 'Modèle', value: item.model },
      { label: 'Problèmes', value: item.issue_types?.join(', ') },
      { label: 'Autre', value: item.other_issue },
      { label: 'Magasin', value: item.store },
      { label: 'Créneau', value: item.preferred_time },
    ];
    if (type === 'contact') return [
      { label: 'Objet', value: item.subject },
      { label: 'Magasin', value: item.store },
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
      { label: 'Magasin', value: item.store },
    ];
    return [];
  };

  return (
    <Card className="bg-white border border-gray-100 hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#1A1A2E] truncate">{getTitle()}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#1A1A2E]/50">
              <span className="flex items-center gap-1"><Clock size={12} />{date}</span>
              {item.phone && <span className="flex items-center gap-1"><Phone size={12} />{item.phone}</span>}
              {item.email && <span className="flex items-center gap-1"><Mail size={12} />{item.email}</span>}
            </div>
          </div>
          {open ? <ChevronUp size={20} className="text-[#1A5C3A] flex-shrink-0" /> : <ChevronDown size={20} className="text-[#1A1A2E]/40 flex-shrink-0" />}
        </button>
        {open && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-3">
            {getDetails().filter(d => d.value).map(d => (
              <div key={d.label}>
                <p className="text-xs font-medium text-[#1A5C3A]">{d.label}</p>
                <p className="text-sm text-[#1A1A2E]">{d.value}</p>
              </div>
            ))}
            <div className="sm:col-span-2 flex flex-wrap gap-2 mt-2">
              {item.phone && <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5EE] rounded-full text-xs text-[#1A5C3A] font-medium hover:bg-[#2ECC71]/20"><Phone size={12} />Appeler</a>}
              {item.email && <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F5EE] rounded-full text-xs text-[#1A5C3A] font-medium hover:bg-[#2ECC71]/20"><Mail size={12} />Email</a>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPage;
