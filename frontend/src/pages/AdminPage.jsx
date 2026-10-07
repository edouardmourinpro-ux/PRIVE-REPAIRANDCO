import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  LogOut, FileText, MessageSquare, Recycle,
  Loader2, ChevronDown, ChevronUp, Clock, Phone, Mail,
  Download, Filter, Sparkles, MessageCircle, Save, Trash2, UserX, RefreshCw, ExternalLink,
  Bell, BellOff, Euro, Check,
} from 'lucide-react';
import { DateRangePicker } from '../components/DateRangePicker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';
import SEO from '../components/SEO';
import { ALERT_SOUND_PRESETS, DEFAULT_ALERT_SOUND, playAlertSound } from '../lib/alertSounds';
import { IdentityModal } from '../components/admin/IdentityModal';
import { StoreGateModal } from '../components/admin/StoreGateModal';
import { RulesBanner } from '../components/admin/RulesBanner';
import { CallLogPanel } from '../components/admin/CallLogPanel';
import { ToCallTab } from '../components/admin/ToCallTab';
import { LOST_REASON_LABELS } from '../data/lostReasons';
import {
  STATUS_META, STATUS_FILTER_ORDER, LEGACY_STATUS_ORDER, FACTURABLE_STATUSES,
  getStatusDisplay, getPreviousStatusBeforeFacture,
} from '../lib/statusDisplay';
import { STAFF_IDENTITY_STORE_MAP, STAFF_IDENTITIES } from '../data/staffIdentities';
import { DEVICE_TYPE_LABELS, parseRdvMessage, formatLeadTitle } from '../lib/leadFormat';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// « Équipe X » → id magasin (staffIdentities.js), inversé ici pour retrouver
// le libellé d'identité à partir de l'id magasin choisi dans la fenêtre
// "Quel magasin ?" (S21).
const STORE_ID_TO_TEAM_IDENTITY = Object.entries(STAFF_IDENTITY_STORE_MAP)
  .reduce((acc, [name, id]) => { acc[id] = name; return acc; }, {});
// Modal "Qui êtes-vous ?" ne propose plus que les prénoms de la direction —
// les identités "Équipe X" sont désormais fixées automatiquement par la
// fenêtre "Quel magasin ?" (S21), jamais choisies à la main.
const DIRECTION_IDENTITIES = STAFF_IDENTITIES.filter(n => !n.startsWith('Équipe '));

const CALL_DETAIL_LABELS = {
  rdv_pris: 'RDV pris', vient_magasin: 'Vient en magasin',
  devis_accepte: 'Devis accepté', rappeler: 'À rappeler', refus: 'Refus',
};

const callResultLabel = (c) => {
  if (!c) return '';
  if (c.outcome === 'joint') {
    let l = CALL_DETAIL_LABELS[c.detail] || c.detail || '';
    if (c.detail === 'refus' && c.refus_reason) l += ` (${LOST_REASON_LABELS[c.refus_reason] || c.refus_reason})`;
    if (c.detail === 'rappeler' && c.callback_at) {
      try { l += ` — ${new Date(c.callback_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`; } catch { /* ignore */ }
    }
    return l;
  }
  if (c.outcome === 'pas_de_reponse') return c.message_laisse ? 'Pas de réponse — message laissé' : 'Pas de réponse — sans message';
  if (c.outcome === 'numero_invalide') return 'Numéro invalide';
  return c.outcome || '';
};

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

const STORE_NAME_MAP = STORES.reduce((acc, s) => { acc[s.id] = s.name; return acc; }, {});

const AdminPage = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('a_appeler');
  const [storeFilter, setStoreFilter] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('admin_store_filter')) || ''
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notifFailedOnly, setNotifFailedOnly] = useState(false);
  const [showNotifTestPanel, setShowNotifTestPanel] = useState(false);
  const [stats, setStats] = useState(null);
  const [showRattrapageModal, setShowRattrapageModal] = useState(false);
  const [rattrapageCode, setRattrapageCode] = useState('');
  const [rattrapageError, setRattrapageError] = useState('');
  const [rattrapageResult, setRattrapageResult] = useState(null);
  const [rattrapageLoading, setRattrapageLoading] = useState(false);
  const [data, setData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toCallData, setToCallData] = useState([]);
  const [toCallLoading, setToCallLoading] = useState(false);
  const [transfo, setTransfo] = useState(null);

  // "Toutes les demandes" déplie Devis/Contact/Rachat — replié par défaut,
  // seul "À appeler" est visible (S23). Le choix est mémorisé.
  const [showAllTabs, setShowAllTabs] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('admin_tabs_expanded') === '1')
  );
  const toggleShowAllTabs = () => {
    const next = !showAllTabs;
    setShowAllTabs(next);
    try { localStorage.setItem('admin_tabs_expanded', next ? '1' : '0'); } catch { /* ignore */ }
    if (!next && activeTab !== 'a_appeler') setActiveTab('a_appeler');
  };

  // ---- "Quel magasin ?" fenêtre obligatoire à chaque connexion (S21) ----
  const [showStoreGate, setShowStoreGate] = useState(false);

  useEffect(() => {
    if (isLoggedIn) setShowStoreGate(true);
  }, [isLoggedIn]);

  const handleGatePickStore = (storeId) => {
    const identity = storeId === 'test'
      ? 'Équipe Magasin TEST'
      : (STORE_ID_TO_TEAM_IDENTITY[storeId] || `Équipe ${STORE_NAME_MAP[storeId] || storeId}`);
    try {
      localStorage.setItem('admin_store_filter', storeId);
      localStorage.setItem('admin_identity', identity);
    } catch { /* ignore */ }
    setStoreFilter(storeId);
    setCurrentIdentity(identity);
    setShowStoreGate(false);
  };

  const handleGatePickAll = () => {
    try { localStorage.setItem('admin_store_filter', ''); } catch { /* ignore */ }
    setStoreFilter('');
    setShowStoreGate(false);
    pendingActionRef.current = null;
    setShowIdentityModal(true);
  };

  // ---- "Qui êtes-vous ?" identity (compte admin partagé — S18 Journal d'appel) ----
  const [currentIdentity, setCurrentIdentity] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('admin_identity')) || '');
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const pendingActionRef = useRef(null);

  const requireIdentity = useCallback((action) => {
    const current = (typeof window !== 'undefined' && localStorage.getItem('admin_identity')) || '';
    if (current) { action(); return; }
    pendingActionRef.current = action;
    setShowIdentityModal(true);
  }, []);

  const handleIdentityConfirm = (name) => {
    localStorage.setItem('admin_identity', name);
    setCurrentIdentity(name);
    setShowIdentityModal(false);
    const mappedStore = STAFF_IDENTITY_STORE_MAP[name];
    if (mappedStore) {
      localStorage.setItem('admin_store_filter', mappedStore);
      setStoreFilter(mappedStore);
    }
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) action();
  };

  // ---- New-lead alerts (Web Audio bip + browser notification) ----
  // The persisted preference (admin_alerts_enabled) lets us AUTO-restart polling
  // + browser notifications after a page reload — the manager sees new leads
  // instantly without clicking. Only the audio bip stays muted until the user
  // performs a click (mandatory browser autoplay rule), tracked by soundArmed.
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [soundArmed, setSoundArmed] = useState(false);
  const [alertSound, setAlertSound] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_ALERT_SOUND;
    return localStorage.getItem('admin_alert_sound') || DEFAULT_ALERT_SOUND;
  });
  const audioCtxRef = useRef(null);
  const lastSeenCreatedAtRef = useRef(null);
  const pollTimerRef = useRef(null);
  const titlePrefixRef = useRef(false);

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
      const params = {};
      if (storeFilter) params.store = storeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const r = await axios.get(`${API_URL}/api/admin/stats`, { headers: authHeaders, params });
      setStats(r.data);
    } catch { setStats(null); }
  }, [storeFilter, dateFrom, dateTo, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (tab = activeTab) => {
    setDataLoading(true);
    try {
      const params = {};
      if (storeFilter) params.store = storeFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      const r = await axios.get(`${API_URL}/api/admin/demandes/${tab}`, { headers: authHeaders, params });
      setData(r.data);
    } catch { setData([]); }
    setDataLoading(false);
  }, [activeTab, storeFilter, dateFrom, dateTo, statusFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadToCall = useCallback(async () => {
    setToCallLoading(true);
    try {
      const params = {};
      if (storeFilter) params.store = storeFilter;
      const r = await axios.get(`${API_URL}/api/admin/to-call`, { headers: authHeaders, params });
      setToCallData(r.data);
    } catch (e) {
      setToCallData([]);
      toast.error('Impossible de charger la liste « À appeler ». Rechargez la page.');
      console.error('loadToCall failed', e);
    }
    setToCallLoading(false);
  }, [storeFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadTransfo = useCallback(async () => {
    try {
      const params = {};
      if (storeFilter) params.store = storeFilter;
      const r = await axios.get(`${API_URL}/api/admin/transfo`, { headers: authHeaders, params });
      setTransfo(r.data);
    } catch { setTransfo(null); }
  }, [storeFilter, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoggedIn) {
      loadStats();
      loadToCall();
      loadTransfo();
      if (activeTab !== 'a_appeler') {
        loadData(activeTab);
      }
    }
  }, [isLoggedIn, activeTab, storeFilter, dateFrom, dateTo, statusFilter, loadStats, loadData, loadToCall, loadTransfo]);

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

  const updateStatus = async (id, newStatus, extra = {}, category = activeTab) => {
    try {
      const payload = { status: newStatus, by: localStorage.getItem('admin_identity') || '' };
      if (extra.lostReasonCode) payload.lost_reason_code = extra.lostReasonCode;
      if (extra.lostReasonText) payload.lost_reason = extra.lostReasonText;
      await axios.patch(`${API_URL}/api/admin/demandes/${category}/${id}/status`, payload, { headers: authHeaders });
      const nowIso = new Date().toISOString();
      setData(prev => prev.map(d => d.id === id ? {
        ...d, status: newStatus,
        status_history: [...(d.status_history || []), { status: newStatus, at: nowIso, by: payload.by }],
        ...(extra.lostReasonCode ? { lost_reason_code: extra.lostReasonCode } : {}),
        ...(extra.lostReasonText ? { lost_reason: extra.lostReasonText } : {}),
      } : d));
      loadToCall();
      loadStats();
      loadTransfo();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la mise à jour du statut');
    }
  };

  const logCall = async (id, payload, category = activeTab) => {
    const res = await axios.post(`${API_URL}/api/admin/demandes/${category}/${id}/call`, payload, { headers: authHeaders });
    const nowIso = new Date().toISOString();
    setData(prev => prev.map(d => {
      if (d.id !== id) return d;
      const entry = { at: nowIso, by: payload.by, outcome: payload.outcome, detail: payload.detail, refus_reason: payload.refus_reason, message_laisse: payload.message_laisse, note: payload.note, callback_at: payload.callback_at };
      const statusChanged = res.data.new_status && res.data.new_status !== d.status;
      return {
        ...d,
        call_attempts: [...(d.call_attempts || []), entry],
        status: res.data.new_status || d.status,
        status_history: statusChanged
          ? [...(d.status_history || []), { status: res.data.new_status, at: nowIso, by: payload.by }]
          : (d.status_history || []),
        first_contact_at: d.first_contact_at || nowIso,
        assigned_to: d.assigned_to || payload.by,
      };
    }));
    loadToCall();
    loadStats();
    toast.success('Appel enregistré');
  };

  const logPassage = async (id, payload, category = activeTab) => {
    await axios.post(`${API_URL}/api/admin/demandes/${category}/${id}/passage`, payload, { headers: authHeaders });
    loadToCall();
    loadStats();
    loadTransfo();
    toast.success('Passage enregistré');
  };

  const saveStaffFeedback = async (id, payload, category = activeTab) => {
    await axios.patch(`${API_URL}/api/admin/demandes/${category}/${id}/feedback`, payload, { headers: authHeaders });
    setData(prev => prev.map(d => d.id === id ? { ...d, ...payload } : d));
  };

  const saveQuotedPrice = async (id, price, category = activeTab) => {
    await axios.patch(
      `${API_URL}/api/admin/demandes/${category}/${id}/quoted-price`,
      { quoted_price: price },
      { headers: authHeaders },
    );
    setData(prev => prev.map(d => d.id === id ? { ...d, quoted_price: price } : d));
  };

  const handleDeleteDemand = async (id, code, category = activeTab) => {
    await axios.delete(`${API_URL}/api/admin/demandes/${category}/${id}`, { headers: authHeaders, data: { code } });
    setData(prev => prev.filter(d => d.id !== id));
    loadToCall();
    loadStats();
  };

  const handleRattrapage = async () => {
    setRattrapageLoading(true);
    setRattrapageError('');
    try {
      const r = await axios.post(`${API_URL}/api/admin/push-sms/rattrapage`, { code: rattrapageCode }, { headers: authHeaders });
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
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
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

  // ---------- New-lead alerts ----------
  const playBeep = useCallback(() => {
    // The Web Audio API needs a user gesture to actually make sound. Until the
    // user clicks the toggle, we stay silent (visual + system notifications
    // still fire though — see notifyNew below).
    if (!soundArmed) return;
    playAlertSound(audioCtxRef.current, alertSound);
  }, [alertSound, soundArmed]);

  const changeAlertSound = useCallback((newId) => {
    setAlertSound(newId);
    localStorage.setItem('admin_alert_sound', newId);
  }, []);

  const armAudio = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      setSoundArmed(true);
    } catch { /* ignore */ }
  }, []);

  const testAlertSound = useCallback(async () => {
    // A test click also counts as a user gesture → unlock audio on the fly.
    await armAudio();
    try { playAlertSound(audioCtxRef.current, alertSound); } catch { /* ignore */ }
  }, [alertSound, armAudio]);

  const handleToggleAlerts = useCallback(async () => {
    // Case 1 — alerts already ON but audio still muted → just arm audio.
    if (alertsEnabled && !soundArmed) {
      await armAudio();
      try { playAlertSound(audioCtxRef.current, alertSound); } catch { /* ignore */ }
      toast.success('Son activé');
      return;
    }
    // Case 2 — alerts ON with sound → turn OFF everything.
    if (alertsEnabled) {
      setAlertsEnabled(false);
      setSoundArmed(false);
      localStorage.setItem('admin_alerts_enabled', '0');
      return;
    }
    // Case 3 — alerts OFF → turn ON (polling + notifications + sound).
    await armAudio();
    try { playAlertSound(audioCtxRef.current, alertSound); } catch { /* ignore */ }
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    } catch { /* ignore */ }
    lastSeenCreatedAtRef.current = null;
    setAlertsEnabled(true);
    localStorage.setItem('admin_alerts_enabled', '1');
    toast.success('Alertes nouveaux leads activées');
  }, [alertsEnabled, soundArmed, armAudio, alertSound]);

  // Auto-restart polling + browser notifications after a page reload if the
  // manager previously activated alerts.  Only the audio bip stays silent
  // until they perform any click (browser autoplay policy).
  useEffect(() => {
    if (!isLoggedIn) return;
    const wasEnabled = localStorage.getItem('admin_alerts_enabled') === '1';
    if (wasEnabled && !alertsEnabled) {
      setAlertsEnabled(true);
    }
  }, [isLoggedIn, alertsEnabled]);

  // Handle document.title prefix ("(nouveau) ") until the tab regains focus.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && titlePrefixRef.current) {
        document.title = document.title.replace(/^\(nouveau\)\s+/, '');
        titlePrefixRef.current = false;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Poll /api/admin/latest every 20s while alerts are ON.
  useEffect(() => {
    if (!isLoggedIn || !alertsEnabled) return undefined;

    let cancelled = false;

    const initBaseline = async () => {
      try {
        const params = {};
        if (storeFilter) params.store = storeFilter;
        const r = await axios.get(`${API_URL}/api/admin/latest`, { headers: authHeaders, params });
        if (cancelled) return;
        const arr = Array.isArray(r.data) ? r.data : [];
        lastSeenCreatedAtRef.current = arr[0]?.created_at || null;
      } catch (err) {
        if (err?.response?.status === 401) {
          // Token expired → stop polling gracefully.
          setAlertsEnabled(false);
        }
      }
    };

    const notifyNew = (fresh) => {
      // 1 or many "new" leads compared to lastSeen.
      const storeLabel = storeFilter
        ? (STORES.find(s => s.id === storeFilter)?.name || storeFilter)
        : 'Tous magasins';
      playBeep();
      // Browser notification (single one, aggregated if many)
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          if (fresh.length === 1) {
            const it = fresh[0];
            const typeLabel = { devis: 'Devis', contact: 'Contact/RDV', rachat: 'Rachat', entreprise: 'Entreprise' }[it.type] || it.type;
            const n = new Notification(`Nouveau lead — ${storeLabel}`, {
              body: `${typeLabel} · ${it.label || 'Client'}`,
              tag: 'repairco-lead',
              renotify: true,
            });
            n.onclick = () => { window.focus(); n.close(); };
          } else {
            const n = new Notification(`${fresh.length} nouveaux leads — ${storeLabel}`, {
              body: 'Ouvrez l’admin pour les consulter.',
              tag: 'repairco-lead',
              renotify: true,
            });
            n.onclick = () => { window.focus(); n.close(); };
          }
        }
      } catch { /* ignore */ }
      // Toast fallback (visible dans l'onglet)
      toast(fresh.length === 1
        ? `Nouveau lead · ${storeLabel}`
        : `${fresh.length} nouveaux leads · ${storeLabel}`);
      // Title prefix if tab is hidden
      if (document.visibilityState !== 'visible' && !titlePrefixRef.current) {
        document.title = `(nouveau) ${document.title}`;
        titlePrefixRef.current = true;
      }
    };

    const tick = async () => {
      try {
        const params = {};
        if (storeFilter) params.store = storeFilter;
        const r = await axios.get(`${API_URL}/api/admin/latest`, { headers: authHeaders, params });
        if (cancelled) return;
        const arr = Array.isArray(r.data) ? r.data : [];
        const baseline = lastSeenCreatedAtRef.current;
        if (!baseline) {
          lastSeenCreatedAtRef.current = arr[0]?.created_at || null;
          return;
        }
        const fresh = arr.filter(x => (x.created_at || '') > baseline);
        if (fresh.length > 0) {
          lastSeenCreatedAtRef.current = fresh[0].created_at;
          notifyNew(fresh);
          // Refresh list + counters so the new lead appears in the UI.
          loadData(activeTab);
          loadStats();
        }
      } catch (err) {
        if (err?.response?.status === 401) {
          setAlertsEnabled(false);
        }
      }
    };

    initBaseline();
    pollTimerRef.current = setInterval(tick, 20000);
    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    };
  }, [isLoggedIn, alertsEnabled, storeFilter, activeTab, loadData, loadStats, playBeep]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#1A5C3A]" size={32} /></div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#E8F5EE] flex items-center justify-center px-4" data-testid="admin-login">
        <SEO title="Admin — Repair & Co" path="/admin" noindex />
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

  const toCallBadgeCount = toCallData.filter(it => it.section === 'maintenant' || it.section === 'a_classer').length;

  const EXTRA_TABS = [
    { id: 'devis', label: 'Devis', icon: FileText, count: stats?.devis },
    { id: 'contact', label: 'Contact / RDV', icon: MessageSquare, count: stats?.contact },
    { id: 'rachat', label: 'Rachat', icon: Recycle, count: stats?.rachat },
  ];
  const openRattrapageModal = () => { setRattrapageCode(''); setRattrapageError(''); setRattrapageResult(null); setShowRattrapageModal(true); };

  const filteredData = notifFailedOnly
    ? data.filter(d => d.notify_status === 'failed' || d.notify_status === 'partial')
    : data;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <SEO title="Admin — Repair & Co" path="/admin" noindex />
      {/* Header */}
      <div className="bg-[#1A5C3A] text-white px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Admin — Repair&Co</h1>
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm hidden sm:inline" data-testid="admin-total-count">
              {stats?.total || 0} demandes · <span className="text-red-300 font-semibold">{toCallBadgeCount} à appeler</span>
            </span>
            <button
              onClick={() => setShowStoreGate(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-xs text-white font-medium transition-colors"
              data-testid="admin-store-gate-change-link"
            >
              🏪 {storeFilter === 'test' ? 'Magasin TEST' : (storeFilter ? (STORE_NAME_MAP[storeFilter] || storeFilter).replace('Repair&Co ', '') : 'Tous les magasins')} · changer
            </button>
            <button
              onClick={() => { pendingActionRef.current = null; setShowIdentityModal(true); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-xs text-white font-medium transition-colors"
              data-testid="admin-identity-change-link"
            >
              👤 {currentIdentity || 'Non défini'} · changer
            </button>
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-white text-white hover:bg-white/10 rounded-full text-xs" data-testid="admin-logout">
              <LogOut size={14} className="mr-1" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <RulesBanner />

      <StoreGateModal
        open={showStoreGate}
        onPickStore={handleGatePickStore}
        onPickAll={handleGatePickAll}
      />

      <IdentityModal
        open={showIdentityModal}
        currentIdentity={currentIdentity}
        onConfirm={handleIdentityConfirm}
        onClose={() => { setShowIdentityModal(false); pendingActionRef.current = null; }}
        options={DIRECTION_IDENTITIES}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-[#E8F5EE]">
          {activeTab !== 'a_appeler' && (
          <>
          <div className="flex items-center gap-2 text-sm text-[#1A1A2E]/70 flex-shrink-0">
            <Filter size={16} className="text-[#1A5C3A]" />
            <span className="font-medium">Magasin :</span>
          </div>
          <select
            value={storeFilter}
            onChange={e => {
              const v = e.target.value;
              setStoreFilter(v);
              try { localStorage.setItem('admin_store_filter', v); } catch { /* ignore */ }
            }}
            className="px-3 py-1.5 border border-[#E8F5EE] rounded-lg text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71]"
            data-testid="admin-store-filter"
          >
            <option value="">Tous les magasins</option>
            {STORES.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="test">Magasin TEST</option>
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
          </>
          )}
          <AlertsToggle
            enabled={alertsEnabled}
            soundArmed={soundArmed}
            onToggle={handleToggleAlerts}
          />
          {alertsEnabled && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                storeFilter
                  ? 'bg-[#E8F5EE] text-[#1A5C3A]'
                  : 'bg-amber-50 text-amber-800'
              }`}
              data-testid="alerts-scope-badge"
              title={storeFilter
                ? 'Vous ne recevrez d’alerte que pour ce magasin.'
                : 'Vous recevrez une alerte pour TOUS les leads. Sélectionnez un magasin ci-dessus pour cibler.'}
            >
              {storeFilter
                ? `Alertes : ${STORES.find(s => s.id === storeFilter)?.name?.replace('Repair&Co ', '') || storeFilter} uniquement`
                : 'Alertes : tous magasins'}
            </span>
          )}
          <AlertSoundPicker
            value={alertSound}
            onChange={changeAlertSound}
            onTest={testAlertSound}
          />
        </div>

        {/* Tabs — seul "À appeler" visible par défaut (S23) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('a_appeler')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'a_appeler' ? 'bg-[#1A5C3A] text-white' : 'bg-white text-[#1A1A2E] hover:bg-[#E8F5EE] border border-[#E8F5EE]'
              }`}
              data-testid="admin-tab-a_appeler"
            >
              <Phone size={16} />
              À appeler
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'a_appeler' ? 'bg-white/20' : 'bg-[#E8F5EE]'}`}>{toCallBadgeCount}</span>
            </button>
            <button
              onClick={toggleShowAllTabs}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                showAllTabs ? 'bg-[#1A1A2E] text-white border-transparent' : 'bg-white text-[#1A1A2E] border-[#E8F5EE] hover:bg-[#E8F5EE]'
              }`}
              data-testid="admin-toggle-all-tabs"
            >
              Toutes les demandes {showAllTabs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAllTabs && EXTRA_TABS.map(t => (
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
          <TransfoPill transfo={transfo} />
        </div>

        {activeTab === 'a_appeler' ? (
          <ToCallTab
            items={toCallData}
            loading={toCallLoading}
            requireIdentity={requireIdentity}
            onLogCall={logCall}
            onStatusChange={updateStatus}
            onLogPassage={logPassage}
            onSaveStaffFeedback={saveStaffFeedback}
            onSaveQuotedPrice={saveQuotedPrice}
            onDelete={handleDeleteDemand}
            onRefresh={loadToCall}
            DemandCard={DemandCard}
          />
        ) : (
        <>
        {/* Status filter bar */}
        <div className="flex flex-wrap gap-2 mb-6" data-testid="admin-status-filter-bar">
          {(() => {
            const catStats = stats?.by_category_status?.[activeTab] || {};
            const totalCat = stats?.[activeTab] || 0;
            const statusTabs = [
              { value: 'all', label: 'Tous', count: totalCat, activeBg: 'bg-[#1A1A2E]', activeText: 'text-white', idleBg: 'bg-white', idleText: 'text-[#1A1A2E]', border: 'border-[#E8F5EE]' },
              ...STATUS_FILTER_ORDER.map(v => ({ value: v, count: catStats[v] || 0, activeText: 'text-white', ...STATUS_META[v] })),
              ...LEGACY_STATUS_ORDER.filter(v => (catStats[v] || 0) > 0).map(v => ({ value: v, count: catStats[v] || 0, activeText: 'text-white', ...STATUS_META[v] })),
            ];
            return statusTabs.map(st => {
              const active = statusFilter === st.value;
              return (
                <button
                  key={st.value}
                  onClick={() => setStatusFilter(st.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active ? `${st.activeBg} ${st.activeText} border-transparent` : `${st.idleBg} ${st.idleText} ${st.border} hover:opacity-80`
                  }`}
                  data-testid={`admin-status-filter-${st.value}`}
                >
                  {st.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${active ? 'bg-white/25' : 'bg-white/70'}`}>{st.count}</span>
                </button>
              );
            });
          })()}
        </div>

        {/* Notif filter toggle */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <button
            onClick={() => setNotifFailedOnly(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              notifFailedOnly ? 'bg-orange-500 text-white border-transparent' : 'bg-white text-[#1A1A2E] border-[#E8F5EE] hover:bg-orange-50'
            }`}
            data-testid="admin-notif-failed-filter"
          >
            <Bell size={13} /> Notification en échec uniquement
          </button>
          <button
            onClick={() => setShowNotifTestPanel(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#E8F5EE] bg-white text-[#1A1A2E] hover:bg-[#E8F5EE] transition-colors"
            data-testid="admin-open-notif-test-panel"
          >
            <MessageCircle size={13} /> Tester les notifications
          </button>
        </div>

        {showNotifTestPanel && <NotifTestPanel authHeaders={authHeaders} onOpenRattrapage={openRattrapageModal} />}

        {/* Content */}
        {dataLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#1A5C3A]" size={32} /></div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12 text-[#1A1A2E]/50" data-testid="admin-empty-state">Aucune demande dans cette catégorie.</div>
        ) : (
          <div className="space-y-3" data-testid="admin-demands-list">
            {filteredData.map((item, idx) => (
              <DemandCard
                key={item.id || idx}
                item={item}
                type={activeTab}
                onStatusChange={updateStatus}
                onSaveStaffFeedback={saveStaffFeedback}
                onSaveQuotedPrice={saveQuotedPrice}
                onDelete={handleDeleteDemand}
                requireIdentity={requireIdentity}
                onLogCall={logCall}
              />
            ))}
          </div>
        )}
        </>
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
              Renvoie un SMS au magasin pour <strong>tous les leads au statut "Nouveau"</strong>. Entrez le code de sécurité.
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
                <p className="text-[#1A5C3A] font-semibold text-lg">{rattrapageResult.count} SMS envoyé{rattrapageResult.count > 1 ? 's' : ''}</p>
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

// Compact sound picker for the new-lead alert bip.  Persists in localStorage
// and lets the admin preview each preset via a "Tester" button.
const AlertSoundPicker = ({ value, onChange, onTest }) => (
  <div className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 border border-[#E8F5EE] rounded-full bg-white">
    <span className="text-xs text-[#1A1A2E]/70 hidden sm:inline">Son :</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent text-xs text-[#1A1A2E] focus:outline-none pr-1 max-w-[150px]"
      data-testid="alert-sound-picker"
      aria-label="Choix du son d'alerte"
    >
      {ALERT_SOUND_PRESETS.map((p) => (
        <option key={p.id} value={p.id}>{p.label}</option>
      ))}
    </select>
    <button
      type="button"
      onClick={onTest}
      data-testid="alert-sound-test-btn"
      title="Écouter le son sélectionné"
      className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F5EE] text-[#1A5C3A] hover:bg-[#2ECC71] hover:text-white transition-colors"
    >
      Tester
    </button>
  </div>
);

// "Activer les alertes" toggle — 3 states:
//   - off    : alerts fully disabled (grey)
//   - silent : polling + browser notifications ON but audio not yet unlocked
//              (auto state after a page reload; prompts the user to arm sound)
//   - on     : full alerts including audio bip (green)
const AlertsToggle = ({ enabled, soundArmed, onToggle }) => {
  const state = !enabled ? 'off' : soundArmed ? 'on' : 'silent';
  const label = state === 'on'
    ? 'Alertes ON'
    : state === 'silent'
      ? 'Activer le son'
      : 'Activer les alertes';
  const title = state === 'on'
    ? 'Cliquez pour désactiver les alertes'
    : state === 'silent'
      ? 'Vous recevez déjà les pop-ups. Cliquez pour activer le bip sonore.'
      : 'Cliquez pour activer bip + notification navigateur à chaque nouveau lead';
  const styleByState = {
    on: 'bg-[#1A5C3A] text-white border-[#1A5C3A] hover:bg-[#2ECC71] hover:border-[#2ECC71]',
    silent: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    off: 'bg-white text-[#1A1A2E] border-[#E8F5EE] hover:bg-[#E8F5EE]',
  };
  return (
    <button
      type="button"
      onClick={onToggle}
      data-testid="alerts-toggle-btn"
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${styleByState[state]}`}
    >
      {state === 'on' ? <Bell size={13} /> : <BellOff size={13} />}
      <span>{label}</span>
    </button>
  );
};

// Pastille "Taux de transfo 30 j" — à droite de la ligne des onglets (S23).
const TransfoPill = ({ transfo }) => {
  if (!transfo) return null;
  const { rate, facture, total } = transfo;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#E8F5EE] text-[#1A5C3A] border border-[#1A5C3A]/20"
      title={`${facture} demande${facture === 1 ? '' : 's'} facturée${facture === 1 ? '' : 's'} sur ${total} reçue${total === 1 ? '' : 's'} ces 30 derniers jours`}
      data-testid="admin-transfo-pill"
    >
      Taux de transfo 30 j · {rate}% · {facture}/{total}
    </span>
  );
};

// Compact inline input for the phone-quoted repair price.  Auto-saves on blur
// or Enter (only if the value changed).  stopPropagation on all events so
// clicking / typing does not toggle the parent DemandCard.
const QuotedPriceInput = ({ itemId, initialValue, onSave }) => {
  const [value, setValue] = useState(initialValue || '');
  const [saved, setSaved] = useState(false);
  const initialRef = useRef(initialValue || '');
  const savedTimerRef = useRef(null);

  useEffect(() => {
    // If the parent (setData) updates the demand, mirror the change.
    setValue(initialValue || '');
    initialRef.current = initialValue || '';
  }, [initialValue]);

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  const flush = async () => {
    const next = (value || '').trim();
    if (next === (initialRef.current || '').trim()) return;
    try {
      await onSave(itemId, next);
      initialRef.current = next;
      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
    } catch {
      toast.error("Erreur lors de l'enregistrement du prix");
    }
  };

  return (
    <div
      className="flex items-center gap-1 pl-2 pr-1 py-1 border border-[#E8F5EE] rounded-lg bg-white focus-within:border-[#2ECC71] transition-colors"
      onClick={e => e.stopPropagation()}
    >
      <Euro size={13} className="text-[#1A5C3A] flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
        }}
        onBlur={flush}
        placeholder="Prix"
        title="Prix annoncé au client au téléphone (note interne)"
        aria-label="Prix annoncé au client"
        className="w-[72px] bg-transparent text-xs text-[#1A1A2E] focus:outline-none placeholder:text-[#1A1A2E]/40"
        data-testid={`quoted-price-input-${itemId}`}
      />
      {saved && (
        <Check
          size={12}
          className="text-[#2ECC71] flex-shrink-0"
          data-testid={`quoted-price-saved-${itemId}`}
        />
      )}
    </div>
  );
};

// Admin panel to manually test the SMS + email flow against a store's real
// recipients, without creating a fake lead — and to create real is_test
// leads that exercise the full escalation flow safely (TEST_RECIPIENT_* only).
const NotifTestPanel = ({ authHeaders, onOpenRattrapage }) => {
  const [store, setStore] = useState(STORES[0]?.id || '');
  const [sendReal, setSendReal] = useState(false);
  const [confirmReal, setConfirmReal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [leadCategory, setLeadCategory] = useState('devis');
  const [samePerson, setSamePerson] = useState(false);
  const [accelerated, setAccelerated] = useState(false);
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadResult, setLeadResult] = useState(null);
  const [leadError, setLeadError] = useState('');

  const [digestLoading, setDigestLoading] = useState(false);
  const [digestResult, setDigestResult] = useState(null);
  const [digestError, setDigestError] = useState('');

  const runTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await axios.post(`${API_URL}/api/admin/notifications/test`, { store, real: sendReal && confirmReal }, { headers: authHeaders });
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du test');
    }
    setLoading(false);
  };

  const createTestLead = async () => {
    setLeadLoading(true);
    setLeadError('');
    setLeadResult(null);
    try {
      const r = await axios.post(`${API_URL}/api/admin/notifications/test-lead`, {
        category: leadCategory, same_person: samePerson, accelerated,
      }, { headers: authHeaders });
      setLeadResult(r.data);
    } catch (err) {
      setLeadError(err.response?.data?.detail || 'Erreur lors de la création du lead de test');
    }
    setLeadLoading(false);
  };

  const runDigestTest = async () => {
    setDigestLoading(true);
    setDigestError('');
    setDigestResult(null);
    try {
      const r = await axios.post(`${API_URL}/api/admin/notifications/digest-test`, {}, { headers: authHeaders });
      setDigestResult(r.data);
    } catch (err) {
      setDigestError(err.response?.data?.detail || 'Erreur lors de l\'envoi du digest de test');
    }
    setDigestLoading(false);
  };

  const renderEntry = (label, entry) => {
    if (!entry) return <p className="text-xs text-gray-400">{label} : aucune tentative</p>;
    if (entry.status === 'sent') return <p className="text-xs text-[#1A5C3A]" data-testid={`notif-test-${label.toLowerCase()}-result`}>{label} : ✅ envoyé à {entry.to}</p>;
    if (entry.status === 'skipped') return <p className="text-xs text-gray-500" data-testid={`notif-test-${label.toLowerCase()}-result`}>{label} : ⏭ ignoré ({entry.error})</p>;
    return <p className="text-xs text-red-600" data-testid={`notif-test-${label.toLowerCase()}-result`}>{label} : ❌ échec — {entry.error}</p>;
  };

  return (
    <div className="space-y-4 mb-6">
      <Card className="bg-white border border-[#E8F5EE]" data-testid="admin-notif-test-panel">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2"><MessageCircle size={15} className="text-[#1A5C3A]" /> Tester les notifications</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={store}
              onChange={e => setStore(e.target.value)}
              className="px-2 py-1.5 border border-[#E8F5EE] rounded-lg text-xs text-[#1A1A2E] bg-white focus:outline-none"
              data-testid="notif-test-store-select"
            >
              {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button onClick={runTest} disabled={loading || (sendReal && !confirmReal)} className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full" data-testid="notif-test-run-button">
              {loading ? <Loader2 className="animate-spin mr-1" size={14} /> : <MessageCircle size={14} className="mr-1" />}
              Envoyer un test
            </Button>
          </div>
          <div className="mt-3 space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-[#1A1A2E] cursor-pointer">
              <input type="checkbox" checked={sendReal} onChange={e => { setSendReal(e.target.checked); if (!e.target.checked) setConfirmReal(false); }} data-testid="notif-test-real-checkbox" />
              Envoyer vraiment au magasin (au lieu de {' '}
              <span className="font-mono">TEST_RECIPIENT_EMAIL</span>)
            </label>
            {sendReal && (
              <label className="flex items-center gap-2 text-xs text-orange-600 cursor-pointer pl-5" data-testid="notif-test-real-confirm-row">
                <input type="checkbox" checked={confirmReal} onChange={e => setConfirmReal(e.target.checked)} data-testid="notif-test-real-confirm-checkbox" />
                Je confirme vouloir déranger le vrai magasin "{STORES.find(s => s.id === store)?.name || store}"
              </label>
            )}
          </div>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
          {result && (
            <div className="mt-3 space-y-1" data-testid="notif-test-results">
              <p className="text-xs text-gray-400">{result.real ? 'Envoi RÉEL au magasin' : 'Envoi de test (TEST_RECIPIENT_*)'}</p>
              {renderEntry('Email', result.email)}
              {renderEntry('SMS', result.sms)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border border-[#E8F5EE]" data-testid="admin-test-lead-panel">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2"><Bell size={15} className="text-[#1A5C3A]" /> Créer un lead de test (magasin TEST)</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={leadCategory} onChange={e => setLeadCategory(e.target.value)}
              className="px-2 py-1.5 border border-[#E8F5EE] rounded-lg text-xs text-[#1A1A2E] bg-white focus:outline-none" data-testid="test-lead-category-select">
              <option value="devis">Devis</option>
              <option value="contact">Contact</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-[#1A1A2E] cursor-pointer">
              <input type="checkbox" checked={samePerson} onChange={e => setSamePerson(e.target.checked)} data-testid="test-lead-same-person-checkbox" />
              Mobile magasin = RPV
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#1A1A2E] cursor-pointer">
              <input type="checkbox" checked={accelerated} onChange={e => setAccelerated(e.target.checked)} data-testid="test-lead-accelerated-checkbox" />
              Délais accélérés (1/2/4 min)
            </label>
            <Button onClick={createTestLead} disabled={leadLoading} className="bg-[#1A5C3A] hover:bg-[#2ECC71] text-white text-xs rounded-full" data-testid="test-lead-create-button">
              {leadLoading ? <Loader2 className="animate-spin mr-1" size={14} /> : <Bell size={14} className="mr-1" />}
              Créer un lead de test
            </Button>
          </div>
          {leadError && <p className="text-red-600 text-xs mt-2">{leadError}</p>}
          {leadResult && (
            <p className="text-xs text-[#1A5C3A] mt-2" data-testid="test-lead-result">
              ✅ Lead {leadResult.category} créé (id {leadResult.id.slice(0, 8)}…) — notifications envoyées à TEST_RECIPIENT_EMAIL, visible dans l'onglet {leadResult.category === 'devis' ? 'Devis' : 'Contact / RDV'} (magasin TEST). Supprimé automatiquement après 48h.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border border-[#E8F5EE]" data-testid="admin-digest-test-panel">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2"><RefreshCw size={15} className="text-[#1A5C3A]" /> Digest quotidien</p>
          <Button onClick={runDigestTest} disabled={digestLoading} variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] text-xs rounded-full" data-testid="digest-test-button">
            {digestLoading ? <Loader2 className="animate-spin mr-1" size={14} /> : <RefreshCw size={14} className="mr-1" />}
            Envoyer le digest de test
          </Button>
          {digestError && <p className="text-red-600 text-xs w-full">{digestError}</p>}
          {digestResult && <p className="text-xs text-[#1A5C3A] w-full" data-testid="digest-test-result">✅ Digest [TEST] envoyé à {digestResult.to}</p>}
        </CardContent>
      </Card>

      <Card className="bg-white border border-[#E8F5EE]" data-testid="admin-rattrapage-panel">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2"><RefreshCw size={15} className="text-[#1A5C3A]" /> Rattrapage leads Nouveau</p>
            <p className="text-xs text-[#1A1A2E]/60 mt-0.5">Renvoie un SMS au magasin pour tous les leads au statut « Nouveau ».</p>
          </div>
          <Button onClick={onOpenRattrapage} variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] text-xs rounded-full" data-testid="admin-rattrapage-btn">
            <RefreshCw size={14} className="mr-1" /> Rattrapage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const DemandCard = ({ item, type, onStatusChange, onSaveStaffFeedback, onSaveQuotedPrice, onDelete, requireIdentity, onLogCall }) => {
  const [open, setOpen] = useState(false);
  const feedbackRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCallPanel, setShowCallPanel] = useState(false);

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

  const handleCallSubmit = (payload) => onLogCall(item.id, { ...payload, by: localStorage.getItem('admin_identity') || '' });

  const getPrenom = () => item.first_name || (item.name || '').split(' ')[0] || '';
  const getNom = () => item.name || item.last_name || '';
  const getStore = () => STORES.find(s => s.id === item.store) || null;
  const getStoreName = () => getStore()?.name || item.store || '';
  const getStorePhone = () => getStore()?.phone || '04 67 71 67 69';

  const buildRelanceText = () => {
    const prenom = getPrenom();
    const nom = getNom();
    const storeName = getStoreName();
    const storePhone = getStorePhone();
    return (
      `Bonjour ${prenom} ${nom},\n\n` +
      `Nous avons bien pris en compte votre demande de réparation.\n\n` +
      `Afin de vous répondre le plus finement possible, nous aurions besoin de vous poser quelques questions techniques.\n\n` +
      `Pourriez-vous nous rappeler s'il vous plaît ? Toute l'équipe sera à votre disposition au ${storePhone}.\n\n` +
      `À l'aide de ces précisions, nous vous indiquerons le prix le plus juste, en tenant compte notamment :\n` +
      `- Des pièces les plus adaptées,\n` +
      `- De la réduction Qualirepar pour laquelle nous sommes labellisés 💪.\n\n` +
      `Bon à savoir aussi : un paiement en 3 ou 4 fois vous sera proposé.\n\n` +
      `À très bientôt,\n` +
      `L'équipe Repair & Co ${storeName}`
    );
  };

  const handleRelanceEmail = () => {
    const subject = encodeURIComponent('Votre demande de réparation chez Repair & Co');
    const body = encodeURIComponent(buildRelanceText());
    window.open(`mailto:${item.email}?subject=${subject}&body=${body}`);
  };

  const handleRelanceWA = () => {
    const phone = (item.phone || '').replace(/[\s\-().]/g, '').replace(/^0/, '33');
    const text = encodeURIComponent(buildRelanceText());
    window.open(`https://wa.me/${phone}?text=${text}`);
  };

  const date = item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const isClosed = (item.status || 'nouveau') === 'facture';
  const hasCustomerSurvey = item.customer_source || item.customer_feedback;
  const statusDisplay = getStatusDisplay(item);
  const showFactureCheckbox = FACTURABLE_STATUSES.includes(item.status || 'nouveau');

  const handleFactureToggle = (checked) => {
    requireIdentity(() => {
      if (checked) {
        setOpen(true);
        onStatusChange(item.id, 'facture');
        setTimeout(() => {
          feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 350);
      } else {
        onStatusChange(item.id, getPreviousStatusBeforeFacture(item));
      }
    });
  };

  const callAttempts = item.call_attempts || [];
  const lastCall = callAttempts.length ? callAttempts[callAttempts.length - 1] : null;
  const showRefusAction = lastCall?.outcome === 'joint' && lastCall?.detail === 'refus' && !['refus_devis', 'client_perdu', 'facture'].includes(item.status);
  const showInvalidAction = lastCall?.outcome === 'numero_invalide' && !['client_perdu', 'facture'].includes(item.status);
  const timeline = [
    ...(item.status_history || []).map(h => ({ at: h.at, by: h.by, note: null, label: `Statut → ${STATUS_META[h.status]?.label || h.status}` })),
    ...callAttempts.map(c => ({ at: c.at, by: c.by, note: c.note, label: `Appel — ${callResultLabel(c)}` })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));


  const getTitle = () => formatLeadTitle(item, type);

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
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_110px_190px_90px_50px_90px_32px] sm:items-center sm:gap-3">
          <button onClick={() => setOpen(!open)} className="flex items-center justify-between text-left min-w-0" data-testid={`demand-toggle-${item.id}`}>
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

          {/* Col 2 — prix annoncé */}
          <QuotedPriceInput
            itemId={item.id}
            initialValue={item.quoted_price || ''}
            onSave={onSaveQuotedPrice}
          />

          {/* Col 3 — statut / prochaine action */}
          <span
            className={`text-xs px-2.5 py-1.5 rounded-full font-medium text-center ${statusDisplay.idleBg} ${statusDisplay.idleText} border ${statusDisplay.border}`}
            data-testid={`demand-status-badge-${item.id}`}
          >
            {statusDisplay.text}
          </span>

          {/* Col 4 — case "Facturé" (visible seulement si le client a dit oui) */}
          <div className="flex items-center justify-center">
            {showFactureCheckbox && (
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#1A5C3A] cursor-pointer" data-testid={`facture-checkbox-label-${item.id}`}>
                <input
                  type="checkbox"
                  checked={item.status === 'facture'}
                  onChange={e => { e.stopPropagation(); handleFactureToggle(e.target.checked); }}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 accent-[#1A5C3A] cursor-pointer"
                  data-testid={`facture-checkbox-${item.id}`}
                />
                Facturé
              </label>
            )}
          </div>

          {/* Col 5 — nombre d'appels */}
          <div className="flex items-center justify-center">
            {callAttempts.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-[#1A5C3A] font-semibold" data-testid={`call-count-${item.id}`}>
                <Phone size={12} /> {callAttempts.length}
              </span>
            )}
          </div>

          {/* Col 6 — bouton Appel */}
          <button
            onClick={e => { e.stopPropagation(); requireIdentity(() => setShowCallPanel(true)); }}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-[#1A5C3A] rounded-full text-xs text-white font-medium hover:bg-[#2ECC71] transition-colors min-h-[30px]"
            data-testid={`call-log-open-${item.id}`}
          >
            <Phone size={12} /> Appel
          </button>

          {/* Col 7 — corbeille */}
          <button
            onClick={e => { e.stopPropagation(); setDeleteCode(''); setDeleteError(''); setShowDeleteModal(true); }}
            className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            title="Supprimer"
            data-testid={`demand-delete-${item.id}`}
          >
            <Trash2 size={13} />
          </button>
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
              {item.email && (
                <button
                  onClick={handleRelanceEmail}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A5C3A] rounded-full text-xs text-white font-medium hover:bg-[#2ECC71] transition-colors"
                  data-testid={`demand-relance-email-${item.id}`}
                >
                  <Mail size={12} /> Relance Email
                </button>
              )}
              {item.phone && (
                <button
                  onClick={handleRelanceWA}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#2ECC71] rounded-full text-xs text-white font-medium hover:bg-[#1A5C3A] transition-colors"
                  data-testid={`demand-relance-wa-${item.id}`}
                >
                  <MessageCircle size={12} /> Relance WhatsApp
                </button>
              )}
              {item.hiboutik_customer_id && (
                <button
                  onClick={() => {
                    const id = String(item.hiboutik_customer_id);
                    try { navigator.clipboard.writeText(id); } catch { /* clipboard blocked */ }
                    window.open('https://repairandco3475.hiboutik.com/', '_blank');
                    toast.success(`ID #${id} copié — colle-le dans la barre de recherche Hiboutik (Cmd+V)`);
                  }}
                  title={`Client Hiboutik #${item.hiboutik_customer_id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A5C3A] rounded-full text-xs text-white font-medium hover:bg-[#154a30] transition-colors"
                  data-testid={`demand-hiboutik-${item.id}`}
                >
                  <ExternalLink size={12} /> Voir dans Hiboutik
                </button>
              )}
            </div>

            {/* Actions rapides suggérées après un appel */}
            {(showRefusAction || showInvalidAction) && (
              <div className="flex flex-wrap gap-2">
                {showRefusAction && (
                  <button
                    onClick={() => requireIdentity(() => onStatusChange(item.id, 'refus_devis', { lostReasonCode: lastCall.refus_reason }))}
                    className="px-3 py-2 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 min-h-[36px]"
                    data-testid={`quick-action-refus-devis-${item.id}`}
                  >
                    Passer en Refus devis
                  </button>
                )}
                {showInvalidAction && (
                  <button
                    onClick={() => requireIdentity(() => onStatusChange(item.id, 'client_perdu', { lostReasonCode: 'numero_invalide' }))}
                    className="px-3 py-2 rounded-full text-xs font-medium bg-gray-200 text-gray-900 hover:bg-gray-300 min-h-[36px]"
                    data-testid={`quick-action-perdu-invalide-${item.id}`}
                  >
                    Passer en perdu — numéro invalide
                  </button>
                )}
              </div>
            )}

            {/* Chronologie des appels et changements de statut */}
            {timeline.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100" data-testid={`call-timeline-${item.id}`}>
                <p className="text-xs font-semibold text-[#1A1A2E] mb-2">Historique</p>
                <ul className="space-y-1.5">
                  {timeline.map((t, i) => (
                    <li key={i} className="text-xs text-[#1A1A2E]/80 flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span>{t.label}{t.note ? ` — « ${t.note} »` : ''}</span>
                      <span className="text-[#1A1A2E]/40 whitespace-nowrap">
                        {new Date(t.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {t.by}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raison perte client */}
            {(item.lost_reason || item.lost_reason_code) && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1"><UserX size={12} /> Raison perte client</p>
                {item.lost_reason_code && <p className="text-sm text-red-700 font-medium">{LOST_REASON_LABELS[item.lost_reason_code] || item.lost_reason_code}</p>}
                {item.lost_reason && <p className="text-sm text-red-700">{item.lost_reason}</p>}
              </div>
            )}

            {/* Staff feedback (visible inline once status = facture / Client Facturé) */}
            {isClosed && (
              <div ref={feedbackRef}>
                <StaffFeedbackForm item={item} onSave={onSaveStaffFeedback} />
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Journal d'appel */}
      <CallLogPanel
        open={showCallPanel}
        onClose={() => setShowCallPanel(false)}
        itemId={item.id}
        phone={item.phone}
        onSubmit={handleCallSubmit}
      />

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
