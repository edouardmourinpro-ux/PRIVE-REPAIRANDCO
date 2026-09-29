import { Component, useState, useEffect, useCallback, useRef } from 'react';
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
import { StorePicker, storeShortName } from '../components/admin/StorePicker';
import { AdminRules } from '../components/admin/AdminRules';
import { CallLogPanel, slotHours } from '../components/admin/CallLogPanel';
import { ToCallTab } from '../components/admin/ToCallTab';
import { LOST_REASON_OPTIONS, LOST_REASON_LABELS } from '../data/lostReasons';
import { STAFF_IDENTITY_STORE_MAP } from '../data/staffIdentities';
import { DEVICE_TYPE_LABELS, parseRdvMessage, formatLeadTitle, clientSmsInfo } from '../lib/leadFormat';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CALL_DETAIL_LABELS = {
  rdv_pris: 'Devis accepté, RDV pris', vient_magasin: 'Vient en magasin',
  devis_accepte: 'Devis accepté, passe sans RDV', reflechit: 'Réfléchit', rappeler: 'À rappeler', refus: 'Refus',
};

const callResultLabel = (c) => {
  if (!c) return '';
  if (c.outcome === 'joint') {
    let l = CALL_DETAIL_LABELS[c.detail] || c.detail || '';
    if (c.detail === 'refus' && c.refus_reason) l += ` (${LOST_REASON_LABELS[c.refus_reason] || c.refus_reason})`;
    if (['rappeler', 'reflechit'].includes(c.detail) && c.callback_at) {
      try { l += `, ${new Date(c.callback_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`; } catch { /* ignore */ }
    }
    if (c.appt_start_at) l += `, ${formatDay(c.appt_start_at)}${c.appt_slot ? ` ${slotHours(c.appt_slot)}` : ''}`;
    if (c.quoted_price) l += ` (prix annoncé : ${c.quoted_price})`;
    return l;
  }
  if (c.outcome === 'pas_de_reponse') {
    const parts = ['Pas de réponse'];
    [['rappel_2e', '2e appel passé', 'pas de 2e appel'],
     ['message_laisse', 'message vocal laissé', 'sans message vocal'],
     ['mail_envoye', 'email envoyé', 'sans email'],
     ['message_envoye', 'WhatsApp envoyé', 'sans WhatsApp']].forEach(([key, oui, non]) => {
      if (c[key] === undefined || c[key] === null) return;
      const raison = c[`${key}_raison`];
      parts.push(c[key] ? oui : (raison ? `${non} (${raison})` : non));
    });
    return parts.join(', ');
  }
  if (c.outcome === 'numero_invalide') return 'Numéro invalide';
  return c.outcome || '';
};

// « Injoignable » exige >= 6 « pas de réponse »,
// mais seulement pour les leads créés après le début du suivi complet (tracking_since).
const canMarkUnreachable = (item) => {
  if (item.created_at && item.tracking_since && item.created_at < item.tracking_since) return true;
  return (item.call_attempts || []).filter(c => c.outcome === 'pas_de_reponse').length >= 6;
};

const STATUS_OPTIONS = [
  { value: 'nouveau',        label: 'Nouveau',                 color: 'bg-red-100 text-red-700' },
  { value: 'pas_de_reponse', label: 'Pas de réponse',          color: 'bg-orange-100 text-orange-700' },
  { value: 'a_rappeler',     label: 'À rappeler',              color: 'bg-amber-100 text-amber-800' },
  { value: 'reflechit',      label: 'Réfléchit',               color: 'bg-purple-100 text-purple-700' },
  { value: 'devis_accepte',  label: 'Devis accepté',            color: 'bg-blue-100 text-blue-700' },
  { value: 'rdv_pris',       label: 'RDV pris',                color: 'bg-cyan-100 text-cyan-800' },
  { value: 'facture',        label: 'Facturé',                 color: 'bg-[#E8F5EE] text-[#1A5C3A]' },
  { value: 'refus_devis',    label: 'Refus',                   color: 'bg-gray-100 text-gray-700' },
  { value: 'client_perdu',   label: 'Perdu',                   color: 'bg-gray-200 text-gray-900' },
  { value: 'contacte',       label: 'Contacté (ancien)',       color: 'bg-orange-50 text-orange-700' },
  { value: 'pris_en_charge', label: 'Pris en charge (ancien)', color: 'bg-blue-50 text-blue-700' },
];

const formatDayTime = iso => new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const formatDay = iso => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });

// Statut affiché avec la prochaine action (heure de rappel, créneau du RDV).
const statusText = (item) => {
  const st = item.status || 'nouveau';
  const base = (STATUS_OPTIONS.find(s => s.value === st) || STATUS_OPTIONS[0]).label;
  if (st === 'rdv_pris' && item.appt_start_at) return `RDV ${formatDay(item.appt_start_at)}, ${slotHours(item.appt_slot)}`;
  if (st === 'devis_accepte' && item.appt_start_at) return `Passe le ${formatDay(item.appt_start_at)}`;
  if (['a_rappeler', 'reflechit'].includes(st) && item.callback_at) return `${base} · ${formatDayTime(item.callback_at)}`;
  return base;
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
  const [showAllDemands, setShowAllDemands] = useState(() => { try { return !!localStorage.getItem('admin_show_all'); } catch { return false; } });
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

  // ---- "Qui êtes-vous ?" identity (compte admin partagé — S18 Journal d'appel) ----
  const [currentIdentity, setCurrentIdentity] = useState(() => (typeof window !== 'undefined' && localStorage.getItem('admin_identity')) || '');
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const pendingActionRef = useRef(null);
  // Choix du magasin : demandé juste après chaque connexion
  const [showStorePicker, setShowStorePicker] = useState(() => { try { return !localStorage.getItem('admin_store_chosen'); } catch { return true; } });
  const [transfo, setTransfo] = useState(null);

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
    try {
      // Taux de transfo du magasin choisi, sur 30 jours (indépendant des filtres de période)
      const r = await axios.get(`${API_URL}/api/admin/transfo`, { headers: authHeaders, params: storeFilter ? { store: storeFilter } : {} });
      setTransfo(r.data);
    } catch { setTransfo(null); }
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

  useEffect(() => {
    if (isLoggedIn) {
      loadStats();
      if (activeTab === 'a_appeler') {
        loadToCall();
      } else {
        loadData(activeTab);
      }
    }
  }, [isLoggedIn, activeTab, storeFilter, dateFrom, dateTo, statusFilter, loadStats, loadData, loadToCall]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const r = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const t = r.data.token;
      localStorage.setItem('admin_token', t);
      localStorage.removeItem('admin_store_chosen');
      setShowStorePicker(true);
      setToken(t);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err.response?.data?.detail || 'Erreur de connexion');
    }
    setLoginLoading(false);
  };

  const logPassage = async (item, payload) => {
    try {
      await axios.post(`${API_URL}/api/admin/demandes/${item.category}/${item.id}/passage`,
        { ...payload, by: localStorage.getItem('admin_identity') || '' }, { headers: authHeaders });
      loadToCall();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Impossible d\'enregistrer la réponse');
    }
  };

  const chooseStore = (id) => {
    setStoreFilter(id);
    try { localStorage.setItem('admin_store_filter', id); localStorage.setItem('admin_store_chosen', '1'); } catch { /* ignore */ }
    setShowStorePicker(false);
    // Un magasin : l'identité est l'équipe du magasin, rien d'autre à demander
    const team = Object.keys(STAFF_IDENTITY_STORE_MAP).find(k => STAFF_IDENTITY_STORE_MAP[k] === id);
    if (team) {
      localStorage.setItem('admin_identity', team);
      setCurrentIdentity(team);
    } else if (id === '') {
      // Direction : on demande qui
      if ((localStorage.getItem('admin_identity') || '').startsWith('Équipe ')) {
        localStorage.removeItem('admin_identity');
        setCurrentIdentity('');
      }
      if (!localStorage.getItem('admin_identity')) setShowIdentityModal(true);
    }
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
        ...(['client_perdu', 'refus_devis'].includes(newStatus) ? {} : { lost_reason_code: null, lost_reason: null }),
        ...(extra.lostReasonCode ? { lost_reason_code: extra.lostReasonCode } : {}),
        ...(extra.lostReasonText ? { lost_reason: extra.lostReasonText } : {}),
      } : d));
      if (activeTab === 'a_appeler') loadToCall();
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la mise à jour du statut');
    }
  };

  const logCall = async (id, payload, category = activeTab) => {
    const res = await axios.post(`${API_URL}/api/admin/demandes/${category}/${id}/call`, payload, { headers: authHeaders });
    const nowIso = new Date().toISOString();
    setData(prev => prev.map(d => {
      if (d.id !== id) return d;
      const entry = { at: nowIso, by: payload.by, outcome: payload.outcome, detail: payload.detail, refus_reason: payload.refus_reason, message_laisse: payload.message_laisse, note: payload.note, callback_at: res.data.callback_at || payload.callback_at, quoted_price: payload.quoted_price, mail_envoye: payload.mail_envoye, message_envoye: payload.message_envoye, appt_start_at: res.data.appt_start_at, appt_slot: res.data.appt_slot };
      const statusChanged = res.data.new_status && res.data.new_status !== d.status;
      return {
        ...d,
        call_attempts: [...(d.call_attempts || []), entry],
        status: res.data.new_status || d.status,
        status_history: statusChanged
          ? [...(d.status_history || []), { status: res.data.new_status, at: nowIso, by: payload.by }]
          : (d.status_history || []),
        lost_reason_code: res.data.lost_reason_code ?? null,
        lost_reason: res.data.lost_reason ?? null,
        quoted_price: res.data.quoted_price ?? d.quoted_price,
        callback_at: res.data.callback_at ?? null,
        appt_date: res.data.appt_date ?? null, appt_slot: res.data.appt_slot ?? null,
        appt_start_at: res.data.appt_start_at ?? null, appt_end_at: res.data.appt_end_at ?? null,
        first_contact_at: d.first_contact_at || nowIso,
        assigned_to: d.assigned_to || payload.by,
      };
    }));
    if (activeTab === 'a_appeler') loadToCall();
    loadStats();
    toast.success('Appel enregistré');
  };

  const logRelance = async (id, payload, category = activeTab) => {
    try {
      const res = await axios.post(`${API_URL}/api/admin/demandes/${category}/${id}/relance`, payload, { headers: authHeaders });
      const nowIso = new Date().toISOString();
      setData(prev => prev.map(d => {
        if (d.id !== id) return d;
        const statusChanged = res.data.new_status && res.data.new_status !== d.status;
        return {
          ...d,
          relances: [...(d.relances || []), { at: nowIso, by: payload.by, channel: payload.channel }],
          status: res.data.new_status || d.status,
          status_history: statusChanged
            ? [...(d.status_history || []), { status: res.data.new_status, at: nowIso, by: payload.by }]
            : (d.status_history || []),
        };
      }));
      if (activeTab === 'a_appeler') loadToCall();
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'enregistrement de la relance");
    }
  };

  const saveStaffFeedback = async (id, payload, category = activeTab) => {
    await axios.patch(`${API_URL}/api/admin/demandes/${category}/${id}/feedback`, payload, { headers: authHeaders });
    setData(prev => prev.map(d => d.id === id ? { ...d, ...payload } : d));
    if (activeTab === 'a_appeler') loadToCall();
  };

  const saveQuotedPrice = async (id, price, category = activeTab) => {
    await axios.patch(
      `${API_URL}/api/admin/demandes/${category}/${id}/quoted-price`,
      { quoted_price: price },
      { headers: authHeaders },
    );
    setData(prev => prev.map(d => d.id === id ? { ...d, quoted_price: price } : d));
    if (activeTab === 'a_appeler') loadToCall();
  };

  const handleDeleteDemand = async (id, code, category = activeTab) => {
    await axios.delete(`${API_URL}/api/admin/demandes/${category}/${id}`, { headers: authHeaders, data: { code } });
    setData(prev => prev.filter(d => d.id !== id));
    loadStats();
    if (activeTab === 'a_appeler') loadToCall();
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
            const n = new Notification(`Nouveau lead · ${storeLabel}`, {
              body: `${typeLabel} · ${it.label || 'Client'}`,
              tag: 'repairco-lead',
              renotify: true,
            });
            n.onclick = () => { window.focus(); n.close(); };
          } else {
            const n = new Notification(`${fresh.length} nouveaux leads · ${storeLabel}`, {
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
        <SEO title="Admin · Repair & Co" path="/admin" noindex />
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

  // « Maintenant » + « À classer » : ce que les équipes ont à faire tout de suite
  const toCallNowCount = toCallData.filter(i => i.section !== 'plus_tard').length;
  const tabs = [
    { id: 'a_appeler', label: 'À appeler', icon: Phone, count: toCallNowCount },
    { id: 'devis', label: 'Devis', icon: FileText, count: stats?.devis },
    { id: 'contact', label: 'Contact / RDV', icon: MessageSquare, count: stats?.contact },
    { id: 'rachat', label: 'Rachat', icon: Recycle, count: stats?.rachat },
  ];

  const filteredData = notifFailedOnly
    ? data.filter(d => d.notify_status === 'failed' || d.notify_status === 'partial')
    : data;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <SEO title="Admin · Repair & Co" path="/admin" noindex />
      {/* Header */}
      <div className="bg-[#1A5C3A] text-white px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Admin · Repair&Co</h1>
          <div className="flex items-center gap-3">
            <span className="text-white/80 text-sm hidden sm:inline" data-testid="admin-total-count">
              {stats?.total || 0} demandes · <span className="text-red-300 font-semibold">{toCallNowCount} à appeler</span>
            </span>
            <button
              onClick={() => setShowStorePicker(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-xs text-white font-medium transition-colors"
              data-testid="admin-store-change-link"
            >
              🏪 {storeFilter === 'test' ? 'Magasin TEST' : storeFilter ? storeShortName(storeFilter) : 'Tous les magasins'} · changer
            </button>
            {!STAFF_IDENTITY_STORE_MAP[currentIdentity] && (
              <button
                onClick={() => { pendingActionRef.current = null; setShowIdentityModal(true); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-xs text-white font-medium transition-colors"
                data-testid="admin-identity-change-link"
              >
                👤 {currentIdentity || 'Qui êtes-vous ?'}
              </button>
            )}
            <Button onClick={handleLogout} variant="outline" size="sm" className="border-white text-white hover:bg-white/10 rounded-full text-xs" data-testid="admin-logout">
              <LogOut size={14} className="mr-1" /> Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <AdminRules />

      <StorePicker
        open={showStorePicker}
        canClose={(() => { try { return !!localStorage.getItem('admin_store_chosen'); } catch { return false; } })()}
        onChoose={chooseStore}
        onClose={() => setShowStorePicker(false)}
      />

      <IdentityModal
        open={showIdentityModal && !showStorePicker}
        currentIdentity={currentIdentity}
        onConfirm={handleIdentityConfirm}
        onClose={() => { setShowIdentityModal(false); pendingActionRef.current = null; }}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 bg-white p-3 rounded-xl border border-[#E8F5EE]">
          {activeTab !== 'a_appeler' && (<>
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
          </>)}

          {activeTab !== 'a_appeler' && (
            <>
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

        {/* Onglets : « À appeler » pour les magasins, « Toutes les demandes » pour le pilotage */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {tabs.filter(t => t.id === 'a_appeler' || showAllDemands).map(t => (
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
          <button
            onClick={() => {
              const next = !showAllDemands;
              setShowAllDemands(next);
              try { localStorage.setItem('admin_show_all', next ? '1' : ''); } catch { /* ignore */ }
              if (!next) setActiveTab('a_appeler');
            }}
            className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium text-[#1A1A2E]/60 hover:text-[#1A5C3A] hover:bg-[#E8F5EE]"
            data-testid="admin-toggle-all-demands"
          >
            {showAllDemands ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAllDemands ? 'Ranger les demandes' : 'Toutes les demandes'}
          </button>
          {transfo && (
            <div
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E8F5EE]"
              title={`${transfo.facture} demandes facturées sur ${transfo.total} reçues ces ${transfo.days} derniers jours`}
              data-testid="admin-transfo"
            >
              <span className="text-xs text-[#1A1A2E]/60">Taux de transfo {transfo.days} j</span>
              <span className="text-lg font-bold text-[#1A5C3A] leading-none">{transfo.total ? `${transfo.rate} %` : '0 %'}</span>
              <span className="text-xs text-[#1A1A2E]/50">{transfo.facture}/{transfo.total}</span>
            </div>
          )}
        </div>

        {activeTab === 'a_appeler' ? (
          <ToCallTab
            items={toCallData}
            loading={toCallLoading}
            requireIdentity={requireIdentity}
            onLogCall={logCall}
            onStatusChange={updateStatus}
            onRefresh={loadToCall}
            onPassage={logPassage}
            renderCard={(item) => (
              <DemandCard
                item={item}
                type={item.category}
                onStatusChange={(id, status, extra) => updateStatus(id, status, extra, item.category)}
                onSaveStaffFeedback={(id, payload) => saveStaffFeedback(id, payload, item.category)}
                onSaveQuotedPrice={(id, price) => saveQuotedPrice(id, price, item.category)}
                onDelete={(id, code) => handleDeleteDemand(id, code, item.category)}
                requireIdentity={requireIdentity}
                onLogCall={(id, payload) => logCall(id, payload, item.category)}
                onLogRelance={(id, payload) => logRelance(id, payload, item.category)}
              />
            )}
          />
        ) : (
        <>
        {/* Status filter bar */}
        <div className="flex flex-wrap gap-2 mb-6" data-testid="admin-status-filter-bar">
          {(() => {
            const catStats = stats?.by_category_status?.[activeTab] || {};
            const totalCat = stats?.[activeTab] || 0;
            const chip = (value, label, activeBg, idleBg, idleText, border) => ({ value, label, count: value === 'all' ? totalCat : (catStats[value] || 0), activeBg, activeText: 'text-white', idleBg, idleText, border });
            const statusTabs = [
              chip('all',            'Tous',           'bg-[#1A1A2E]', 'bg-white',     'text-[#1A1A2E]',  'border-[#E8F5EE]'),
              chip('nouveau',        'Nouveau',        'bg-red-500',   'bg-red-50',    'text-red-700',    'border-red-100'),
              chip('pas_de_reponse', 'Pas de réponse', 'bg-orange-500','bg-orange-50', 'text-orange-700', 'border-orange-100'),
              chip('a_rappeler',     'À rappeler',     'bg-amber-500', 'bg-amber-50',  'text-amber-800',  'border-amber-100'),
              chip('reflechit',      'Réfléchit',      'bg-purple-500','bg-purple-50', 'text-purple-700', 'border-purple-100'),
              chip('devis_accepte',  'Devis accepté',  'bg-blue-500',  'bg-blue-50',   'text-blue-700',   'border-blue-100'),
              chip('rdv_pris',       'RDV pris',       'bg-cyan-600',  'bg-cyan-50',   'text-cyan-800',   'border-cyan-100'),
              chip('facture',        'Facturé',        'bg-[#1A5C3A]', 'bg-[#E8F5EE]', 'text-[#1A5C3A]',  'border-[#E8F5EE]'),
              chip('refus_devis',    'Refus',          'bg-gray-500',  'bg-gray-50',   'text-gray-700',   'border-gray-200'),
              chip('client_perdu',   'Perdu',          'bg-gray-800',  'bg-gray-100',  'text-gray-900',   'border-gray-300'),
              // anciens statuts : visibles seulement s'il reste des demandes dedans
              chip('contacte',       'Contacté (ancien)',       'bg-orange-400', 'bg-white', 'text-orange-700', 'border-orange-100'),
              chip('pris_en_charge', 'Pris en charge (ancien)', 'bg-blue-400',   'bg-white', 'text-blue-700',   'border-blue-100'),
            ].filter(st => !['contacte', 'pris_en_charge'].includes(st.value) || st.count > 0 || statusFilter === st.value);
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

        {showNotifTestPanel && (
          <NotifTestPanel
            authHeaders={authHeaders}
            onOpenRattrapage={() => { setRattrapageCode(''); setRattrapageError(''); setRattrapageResult(null); setShowRattrapageModal(true); }}
          />
        )}

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
                onLogRelance={logRelance}
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

// Small colored dot showing whether SMS+email actually reached the store for
// this lead — 🟢 ok / 🟠 partial / 🔴 failed / — no data (pre-dates this feature).
const NotifBadge = ({ item }) => {
  const status = item.notify_status;
  if (!status) {
    return <span className="text-xs text-gray-300" data-testid={`notif-badge-${item.id}`} title="Pas de suivi (lead antérieur)">·</span>;
  }
  const cfg = {
    ok: { color: 'bg-green-500', label: 'Notification envoyée' },
    partial: { color: 'bg-orange-500', label: 'Notification partielle' },
    failed: { color: 'bg-red-500', label: 'Notification en échec' },
  }[status] || { color: 'bg-gray-300', label: status };
  const details = (item.notifications || []).map(n => {
    const chan = n.channel === 'sms' ? 'SMS' : 'Email';
    const when = n.at ? new Date(n.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    return n.status === 'sent'
      ? `${chan} → ${n.to} (${when})`
      : `${chan} → ${n.to} : ÉCHEC (${n.error || 'inconnu'})`;
  }).join('\n') || 'Aucune tentative enregistrée';
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.color}`}
      title={`${cfg.label}\n${details}`}
      data-testid={`notif-badge-${item.id}`}
    />
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

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const createDemoSet = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const r = await axios.post(`${API_URL}/api/admin/notifications/demo-set`, {}, { headers: authHeaders });
      setDemoResult(r.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création des demandes de démo');
    }
    setDemoLoading(false);
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
    return <p className="text-xs text-red-600" data-testid={`notif-test-${label.toLowerCase()}-result`}>{label} : ❌ échec : {entry.error}</p>;
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
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#E8F5EE]">
            <Button onClick={createDemoSet} disabled={demoLoading} variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] text-xs rounded-full" data-testid="demo-set-create-button">
              {demoLoading && <Loader2 className="animate-spin mr-1" size={14} />}
              Créer des demandes de démo
            </Button>
            <span className="text-xs text-[#1A1A2E]/60">Un exemple de chaque statut, dans chaque onglet. Remet la démo à zéro. Aucun envoi.</span>
          </div>
          {demoResult && (
            <p className="text-xs text-[#1A5C3A] mt-2" data-testid="demo-set-result">
              ✅ {demoResult.created} demandes de démo créées.{!demoResult.demo_mode && ' Dans « Magasin », choisissez « Magasin TEST ».'}
            </p>
          )}
          {leadError && <p className="text-red-600 text-xs mt-2">{leadError}</p>}
          {leadResult && (
            <p className="text-xs text-[#1A5C3A] mt-2" data-testid="test-lead-result">
              ✅ Lead {leadResult.category} créé (id {leadResult.id.slice(0, 8)}…). Notifications envoyées à TEST_RECIPIENT_EMAIL, visible dans l'onglet {leadResult.category === 'devis' ? 'Devis' : 'Contact / RDV'} (magasin TEST). Supprimé automatiquement après 48h.
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
          <p className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2"><RefreshCw size={15} className="text-[#1A5C3A]" /> Rattrapage des alertes</p>
          <Button onClick={onOpenRattrapage} variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] text-xs rounded-full" data-testid="admin-rattrapage-btn">
            <RefreshCw size={14} className="mr-1" /> Rattrapage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const DemandCard = ({ item, type, onStatusChange, onSaveStaffFeedback, onSaveQuotedPrice, onDelete, requireIdentity, onLogCall, onLogRelance }) => {
  const [open, setOpen] = useState(false);
  const feedbackRef = useRef(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasonCode, setLostReasonCode] = useState('');
  const [lostReasonText, setLostReasonText] = useState('');
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

  const handleLostSubmit = () => {
    if (!lostReasonCode) return;
    requireIdentity(() => {
      onStatusChange(item.id, 'client_perdu', { lostReasonCode, lostReasonText: lostReasonText.trim() || undefined });
      setShowLostModal(false);
    });
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
      `L'équipe Repair & Co ${storeName.replace(/^Repair\s*&\s*Co\s*/i, '')}`
    );
  };

  const logRelance = (channel) => requireIdentity(() => onLogRelance?.(item.id, { channel, by: localStorage.getItem('admin_identity') || '' }));

  const openRelanceEmail = () => {
    const subject = encodeURIComponent('Votre demande de réparation chez Repair & Co');
    const body = encodeURIComponent(buildRelanceText());
    window.open(`mailto:${item.email}?subject=${subject}&body=${body}`);
  };

  const handleRelanceEmail = () => {
    openRelanceEmail();
    logRelance('email');
  };

  const openRelanceWA = () => {
    const phone = (item.phone || '').replace(/[\s\-().]/g, '').replace(/^0/, '33');
    const text = encodeURIComponent(buildRelanceText());
    window.open(`https://wa.me/${phone}?text=${text}`);
  };

  const handleRelanceWA = () => {
    openRelanceWA();
    logRelance('whatsapp');
  };

  const date = item.created_at ? new Date(item.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const currentStatus = STATUS_OPTIONS.find(s => s.value === (item.status || 'nouveau')) || STATUS_OPTIONS[0];
  const isClosed = (item.status || 'nouveau') === 'facture';
  const hasCustomerSurvey = item.customer_source || item.customer_feedback;

  const handleStatusChange = async (newStatus) => {
    requireIdentity(() => {
      if (newStatus === 'client_perdu') {
        setLostReasonCode(''); setLostReasonText('');
        setShowLostModal(true);
        return;
      }
      onStatusChange(item.id, newStatus);
    });
  };

  // Case « Facturé » : seulement quand le client a accepté (ou déjà facturé, pour pouvoir décocher)
  const status = item.status || 'nouveau';
  const canFacture = ['devis_accepte', 'rdv_pris', 'pris_en_charge', 'facture'].includes(status);
  const toggleFacture = (checked) => {
    if (checked) return handleStatusChange('facture');
    // décoché : on revient au statut d'avant
    const previous = [...(item.status_history || [])].reverse().find(h => h.status && h.status !== 'facture');
    handleStatusChange(previous?.status || 'devis_accepte');
  };

  const callAttempts = item.call_attempts || [];
  const lastCall = callAttempts.length ? callAttempts[callAttempts.length - 1] : null;
  const unreachableAllowed = canMarkUnreachable(item);
  const timeline = [
    ...(item.status_history || []).map(h => ({ at: h.at, by: h.by, note: null, label: `Statut → ${STATUS_OPTIONS.find(s => s.value === h.status)?.label || h.status}` })),
    ...callAttempts.map(c => ({ at: c.at, by: c.by, note: c.note, label: `Appel : ${callResultLabel(c)}` })),
    ...(item.relances || []).map(r => ({ at: r.at, by: r.by, note: null, label: r.channel === 'whatsapp' ? 'Relance WhatsApp' : 'Relance Email' })),
    ...(item.client_sms || []).map(m => ({ at: m.at, by: 'système', note: null, label: `SMS envoyé au client (${m.kind === 'client_rdv' ? 'confirmation du RDV' : 'demande bien reçue'})${m.status === 'sent' ? '' : ' : échec'}` })),
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

          {/* Colonnes de largeur fixe (écran large) : prix, statut et Appel alignés d'une ligne à l'autre */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end sm:flex-nowrap">
            <QuotedPriceInput
              itemId={item.id}
              initialValue={item.quoted_price || ''}
              onSave={onSaveQuotedPrice}
            />
            <div className="sm:w-52 flex">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${currentStatus.color}`} data-testid={`demand-status-badge-${item.id}`}>
                {statusText(item)}
              </span>
            </div>
            <span className="sm:w-20 flex">
              {canFacture && (
                <label
                  onClick={e => e.stopPropagation()}
                  className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${status === 'facture' ? 'text-[#1A5C3A]' : 'text-[#1A1A2E]/70 hover:text-[#1A5C3A]'}`}
                  title={status === 'facture' ? 'Décocher si c\'est une erreur' : 'Cochez quand le client a payé'}
                  data-testid={`demand-facture-${item.id}`}
                >
                  <input type="checkbox" checked={status === 'facture'} onChange={e => toggleFacture(e.target.checked)} className="w-4 h-4 accent-[#1A5C3A] cursor-pointer" />
                  {status !== 'facture' && 'Facturé'}
                </label>
              )}
            </span>
            <span className="sm:w-3 flex justify-center"><NotifBadge item={item} /></span>
            <span className="sm:w-8 flex items-center gap-1 text-xs text-[#1A5C3A] font-semibold" data-testid={callAttempts.length > 0 ? `call-count-${item.id}` : undefined}>
              {callAttempts.length > 0 && <><Phone size={12} /> {callAttempts.length}</>}
            </span>
            <button
              onClick={e => { e.stopPropagation(); requireIdentity(() => setShowCallPanel(true)); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1A5C3A] rounded-full text-xs text-white font-medium hover:bg-[#2ECC71] transition-colors min-h-[30px]"
              data-testid={`call-log-open-${item.id}`}
            >
              <Phone size={12} /> Appel
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
                    toast.success(`ID #${id} copié, colle-le dans la barre de recherche Hiboutik (Cmd+V)`);
                  }}
                  title={`Client Hiboutik #${item.hiboutik_customer_id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1A5C3A] rounded-full text-xs text-white font-medium hover:bg-[#154a30] transition-colors"
                  data-testid={`demand-hiboutik-${item.id}`}
                >
                  <ExternalLink size={12} /> Voir dans Hiboutik
                </button>
              )}
            </div>

            {/* Chronologie des appels et changements de statut */}
            {timeline.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100" data-testid={`call-timeline-${item.id}`}>
                <p className="text-xs font-semibold text-[#1A1A2E] mb-2">Historique</p>
                <ul className="space-y-1.5">
                  {timeline.map((t, i) => (
                    <li key={i} className="text-xs text-[#1A1A2E]/80 flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span>{t.label}{t.note ? ` : « ${t.note} »` : ''}</span>
                      <span className="text-[#1A1A2E]/40 whitespace-nowrap">
                        {new Date(t.at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {t.by}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raison perte client */}
            {['client_perdu', 'refus_devis'].includes(item.status) && (item.lost_reason || item.lost_reason_code) && (
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
        onOpenEmail={item.email ? openRelanceEmail : undefined}
        onOpenWhatsApp={item.phone ? openRelanceWA : undefined}
        clientRdv={item.rdv_date ? { date: item.rdv_date, slot: item.rdv_slot } : null}
        clientSms={clientSmsInfo(item)}
      />

      {/* Client perdu — motif fixe en un clic */}
      <Dialog open={showLostModal} onOpenChange={o => { setShowLostModal(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#1A1A2E] flex items-center gap-2">
              <UserX size={18} className="text-red-500" /> Client perdu
            </DialogTitle>
            <DialogDescription>
              Choisissez le motif (1 clic).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid gap-1.5 max-h-64 overflow-y-auto">
              {LOST_REASON_OPTIONS.map(r => {
                const disabled = r.value === 'injoignable' && !unreachableAllowed;
                const selected = lostReasonCode === r.value;
                const passDeReponseCount = callAttempts.filter(c => c.outcome === 'pas_de_reponse').length;
                return (
                  <div key={r.value}>
                    <button
                      disabled={disabled}
                      onClick={() => setLostReasonCode(r.value)}
                      title={disabled ? 'Nécessite 6 appels « Pas de réponse »' : ''}
                      className={`w-full min-h-[44px] px-3 rounded-lg text-sm border text-left transition-colors ${
                        selected ? 'bg-red-600 text-white border-red-600'
                          : disabled ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white border-gray-200 text-[#1A1A2E] hover:bg-red-50'
                      }`}
                      data-testid={`lost-reason-chip-${r.value}-${item.id}`}
                    >
                      {r.label}
                    </button>
                    {r.value === 'injoignable' && disabled && (
                      <p className="text-[11px] text-gray-400 mt-1 px-1" data-testid={`lost-reason-injoignable-hint-${item.id}`}>
                        {passDeReponseCount}/6 appels sans réponse
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <textarea
              value={lostReasonText}
              onChange={e => setLostReasonText(e.target.value)}
              placeholder="Détail facultatif..."
              rows={2}
              className="form-textarea w-full text-sm"
              data-testid={`lost-reason-detail-${item.id}`}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLostModal(false)} className="text-xs rounded-full">
                Annuler
              </Button>
              <Button
                onClick={handleLostSubmit}
                disabled={!lostReasonCode}
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

// Filet de sécurité : jamais d'écran blanc. En cas d'erreur, on affiche le message et un bouton pour recharger.
class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6" data-testid="admin-error">
        <div className="max-w-md bg-white border border-red-200 rounded-xl p-6 text-center">
          <p className="text-lg font-semibold text-[#1A1A2E] mb-2">L'admin a rencontré une erreur</p>
          <p className="text-sm text-[#1A1A2E]/70 mb-4">Rechargez la page. Si le problème revient, faites une capture de ce message.</p>
          <p className="text-xs text-red-700 bg-red-50 rounded p-2 mb-4 break-words">{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-full bg-[#1A5C3A] text-white text-sm font-medium">Recharger</button>
        </div>
      </div>
    );
  }
}

const AdminPageWithBoundary = () => (
  <AdminErrorBoundary>
    <AdminPage />
  </AdminErrorBoundary>
);

export default AdminPageWithBoundary;
