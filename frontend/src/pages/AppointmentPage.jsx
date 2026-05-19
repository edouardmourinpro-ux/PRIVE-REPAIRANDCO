import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Calendar, Clock, MapPin, Phone, Loader2, CheckCircle, Mail, BadgeCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { STORES, DEVICE_BRANDS, ISSUE_TYPES } from '../data/stores';
import MiniSurvey from '../components/MiniSurvey';
import { trackFormSubmission } from '../lib/analytics';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const rdvSchema = z.object({
  first_name: z.string().min(2, 'Entrez votre prénom'),
  name: z.string().min(2, 'Entrez votre nom'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  email: z.string().email('Entrez un email valide'),
  message: z.string().optional(),
});

const AppointmentPage = () => {
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [brand, setBrand] = useState('');
  const [otherBrand, setOtherBrand] = useState('');
  const [model, setModel] = useState('');
  const [issueType, setIssueType] = useState('');
  const [otherIssue, setOtherIssue] = useState('');
  const [rdvDate, setRdvDate] = useState('');
  const [rdvSlot, setRdvSlot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [demandId, setDemandId] = useState(null);

  useEffect(() => {
    if (isSuccess) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSuccess]);

  const selectedStore = STORES.find(s => s.id === selectedStoreId);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(rdvSchema),
  });

  const deviceTypes = [
    { id: 'smartphone', label: 'Smartphone', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/i65cqvig_Smartphone%20casse%CC%81.png' },
    { id: 'tablette', label: 'Tablette', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/i65cqvig_Smartphone%20casse%CC%81.png' },
    { id: 'pc', label: 'PC', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/lmcslwwi_Ordinateur%20e%CC%81cran%20casse%CC%81.png' },
    { id: 'electromenager', label: 'Électroménager', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/96fmgzu8_Machine%20a%CC%80%20cafe%CC%81.png' },
    { id: 'velo-trottinette', label: 'Mobilité', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/5wivdev5_Trottinette%20e%CC%81lectrique.png' },
    { id: 'autre', label: 'Autre', icon: 'dots' },
  ];

  const getBrands = () => {
    const map = {
      smartphone: ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Oppo', 'Autre'],
      tablette: ['Apple iPad', 'Samsung Galaxy Tab', 'Lenovo', 'Huawei', 'Microsoft Surface', 'Autre'],
      pc: ['HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Apple MacBook', 'MSI', 'Autre'],
      electromenager: ['Dyson', 'Bosch', 'Moulinex', 'SEB', 'Nespresso', "De'Longhi", 'Philips', 'Autre'],
      'velo-trottinette': ['Xiaomi', 'Segway', 'Decathlon', 'Autre'],
    };
    return map[deviceType] || ['Autre'];
  };

  const getIssues = () => {
    const map = {
      smartphone: ['Écran cassé', 'Batterie / autonomie', 'Connecteur de charge', 'Caméra', 'Bouton power / volume', 'Problème logiciel', "Ne s'allume plus", 'Autre'],
      tablette: ['Écran cassé', 'Batterie', 'Connecteur de charge', 'Problème logiciel', 'Autre'],
      pc: ['Écran cassé', 'Clavier', 'Batterie', 'Disque dur / SSD', 'Système lent', 'Virus', 'Autre'],
      electromenager: ["Ne s'allume plus", 'Fuite', 'Bruit anormal', 'Perte de puissance', 'Autre'],
      'velo-trottinette': ['Batterie', 'Moteur', 'Freins', 'Pneus', 'Écran / tableau de bord', 'Autre'],
    };
    return map[deviceType] || ['Autre'];
  };

  const onSubmit = async (data) => {
    if (!selectedStoreId) { toast.error('Sélectionnez un magasin'); return; }
    setIsSubmitting(true);
    const finalBrand = brand === 'Autre' ? otherBrand : brand;
    const finalIssue = issueType === 'Autre' ? otherIssue : issueType;
    try {
      const r = await axios.post(`${API_URL}/api/contact`, {
        ...data,
        store: selectedStoreId,
        subject: `RDV — ${deviceType || 'Non précisé'} ${finalBrand || ''} ${model || ''} — ${finalIssue || 'Non précisé'} — ${rdvDate || ''} ${rdvSlot || ''}`.trim(),
        message: data.message || '',
        rdv_device_type: deviceType || null,
        rdv_brand: finalBrand || null,
        rdv_model: model || null,
        rdv_issue: finalIssue || null,
        rdv_date: rdvDate || null,
        rdv_slot: rdvSlot || null,
      });
      setDemandId(r.data?.id || null);
      setIsSuccess(true);
      trackFormSubmission('rdv', { store: selectedStoreId, device_type: deviceType || null });
      toast.success('Demande de rendez-vous envoyée !');
    } catch {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div data-testid="appointment-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#2ECC71]" size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-4">Demande reçue !</h1>
          <p className="text-lg text-[#1A1A2E]/80 mb-6">Un technicien vous rappelle sous 15 minutes pour confirmer votre rendez-vous.</p>
          <MiniSurvey demandId={demandId} category="contact" />
          <div className="mt-8">
            <Button onClick={() => window.location.href = '/'} className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full">Retour à l'accueil</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="appointment-page">
      {/* Hero */}
      <section className="py-12 lg:py-16 hero-gradient">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Prendre <span className="text-[#2ECC71]">rendez-vous</span>
          </h1>
          <p className="mt-4 text-lg text-[#1A1A2E]/80 max-w-lg">
            Choisissez votre magasin et réservez votre créneau pour une réparation rapide et garantie.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Store Selection */}
          <Card className="card-repair border-2 border-[#E8F5EE] mb-8">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <Calendar className="text-[#1A5C3A]" size={24} />
                <h2 className="text-xl font-bold">Pour quel magasin souhaitez-vous prendre rendez-vous ?</h2>
              </div>
              <Select onValueChange={setSelectedStoreId} value={selectedStoreId}>
                <SelectTrigger data-testid="appointment-store-select" className="form-select text-base py-4">
                  <SelectValue placeholder="Choisissez votre magasin" />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.name} — {store.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedStore ? (
            <div className="animate-fade-in-up space-y-8">
              {/* Store Card */}
              <Card className="store-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedStore.name}</h3>
                      {selectedStore.location && <p className="text-[#1A5C3A]/60 text-xs">{selectedStore.location}</p>}
                    </div>
                    {selectedStore.qualirepar && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F5EE] rounded-full text-[#1A5C3A] text-xs font-medium">
                        <BadgeCheck size={14} /> QualiRépar
                      </div>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm text-[#1A1A2E]/70">
                    <div className="flex items-start gap-2"><MapPin size={14} className="text-[#1A5C3A] mt-0.5 flex-shrink-0" /><span className="text-xs">{selectedStore.address}, {selectedStore.postalCode} {selectedStore.city}</span></div>
                    <div className="flex items-center gap-2"><Clock size={14} className="text-[#1A5C3A] flex-shrink-0" /><span className="text-xs">{selectedStore.hours}</span></div>
                    <div className="flex items-center gap-2"><Phone size={14} className="text-[#1A5C3A] flex-shrink-0" /><a href={`tel:${selectedStore.phone.replace(/\s/g, '')}`} className="text-xs hover:underline">{selectedStore.phone}</a></div>
                    <div className="flex items-center gap-2"><Mail size={14} className="text-[#1A5C3A] flex-shrink-0" /><a href={`mailto:${selectedStore.email}`} className="text-xs hover:underline">{selectedStore.email}</a></div>
                  </div>
                </CardContent>
              </Card>

              {/* Form */}
              <Card className="card-repair">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6">Demande de rendez-vous</h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* 1. Device Type */}
                    <div>
                      <Label className="text-[#1A1A2E] mb-3 block font-medium">Type d'appareil</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {deviceTypes.map((dt) => (
                          <button key={dt.id} type="button" onClick={() => { setDeviceType(dt.id); setBrand(''); setIssueType(''); }}
                            className={`h-[100px] flex flex-col items-center justify-center rounded-xl border-2 transition-all text-center px-2 ${deviceType === dt.id ? 'border-[#2ECC71] bg-[#E8F5EE]' : 'border-[#E8F5EE] hover:border-[#2ECC71]/50'}`}
                            data-testid={`rdv-device-${dt.id}`}>
                            {dt.picto ? (
                              <img src={dt.picto} alt={dt.label} className="w-8 h-8 object-contain mb-1.5" />
                            ) : (
                              <span className="text-[#1A5C3A] text-2xl font-bold mb-1.5">...</span>
                            )}
                            <span className="text-[10px] sm:text-xs font-medium text-[#1A5C3A] leading-tight">{dt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Brand */}
                    {deviceType && deviceType !== 'autre' && (
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Marque</Label>
                        <Select onValueChange={setBrand} value={brand}>
                          <SelectTrigger className="form-select" data-testid="rdv-brand">
                            <SelectValue placeholder="Sélectionnez une marque" />
                          </SelectTrigger>
                          <SelectContent>
                            {getBrands().map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {brand === 'Autre' && (
                          <Input className="form-input mt-2" placeholder="Précisez la marque" value={otherBrand} onChange={e => setOtherBrand(e.target.value)} data-testid="rdv-other-brand" />
                        )}
                      </div>
                    )}

                    {/* 3. Model */}
                    {deviceType && (
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Modèle</Label>
                        <Input className="form-input" placeholder="Ex : iPhone 14 Pro, Galaxy S23, MacBook Air M2..." value={model} onChange={e => setModel(e.target.value)} data-testid="rdv-model" />
                      </div>
                    )}

                    {/* 4. Issue */}
                    {deviceType && deviceType !== 'autre' && (
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Type de panne / Problème</Label>
                        <Select onValueChange={setIssueType} value={issueType}>
                          <SelectTrigger className="form-select" data-testid="rdv-issue">
                            <SelectValue placeholder="Sélectionnez le problème" />
                          </SelectTrigger>
                          <SelectContent>
                            {getIssues().map((iss) => <SelectItem key={iss} value={iss}>{iss}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {issueType === 'Autre' && (
                          <Input className="form-input mt-2" placeholder="Précisez le problème" value={otherIssue} onChange={e => setOtherIssue(e.target.value)} data-testid="rdv-other-issue" />
                        )}
                      </div>
                    )}

                    {/* 5. Contact */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Prénom <span className="text-red-500">*</span></Label>
                        <Input {...register('first_name')} className="form-input" placeholder="Votre prénom" data-testid="appointment-first-name" />
                        {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
                      </div>
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Nom <span className="text-red-500">*</span></Label>
                        <Input {...register('name')} className="form-input" placeholder="Votre nom" data-testid="appointment-name" />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Téléphone</Label>
                        <Input {...register('phone')} className="form-input" placeholder="06 12 34 56 78" data-testid="appointment-phone" />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[#1A1A2E] mb-2 block">Email</Label>
                      <Input {...register('email')} type="email" className="form-input" placeholder="votre@email.com" data-testid="appointment-email" />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                    </div>

                    {/* 6. Date & Slot */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Date souhaitée</Label>
                        <Input type="date" className="form-input" value={rdvDate} onChange={e => setRdvDate(e.target.value)} data-testid="rdv-date" min={new Date().toISOString().split('T')[0]} />
                      </div>
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Créneau</Label>
                        <Select onValueChange={setRdvSlot} value={rdvSlot}>
                          <SelectTrigger className="form-select" data-testid="rdv-slot">
                            <SelectValue placeholder="Choisissez un créneau" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Matin (9h30-12h30)">Matin (9h30-12h30)</SelectItem>
                            <SelectItem value="Après-midi (14h-17h)">Après-midi (14h-17h)</SelectItem>
                            <SelectItem value="Fin de journée (17h-19h30)">Fin de journée (17h-19h30)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 7. Message */}
                    <div>
                      <Label className="text-[#1A1A2E] mb-2 block">Message (optionnel)</Label>
                      <Textarea {...register('message')} className="form-textarea" placeholder="Précisez votre demande..." rows={3} data-testid="appointment-message" />
                    </div>

                    {/* 8. Submit */}
                    <Button type="submit" disabled={isSubmitting} data-testid="appointment-submit" className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full py-5">
                      {isSubmitting ? (<><Loader2 className="animate-spin mr-2" size={18} /> Envoi...</>) : 'Envoyer ma demande de rendez-vous'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <p className="text-center text-[#1A1A2E]/60 text-sm">
                Vous pouvez également venir directement en magasin sans rendez-vous, selon la disponibilité de nos techniciens.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-[#E8F5EE] rounded-2xl">
              <Calendar className="text-[#1A5C3A]/30 mx-auto mb-4" size={48} />
              <p className="text-[#1A1A2E]/50 text-lg">Sélectionnez un magasin ci-dessus pour accéder au formulaire de prise de rendez-vous.</p>
            </div>
          )}
        </div>
      </section>

      {/* QualiRépar Banner */}
      <section className="py-12 lg:py-16 bg-[#E8F5EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="flex justify-center order-2 lg:order-1">
              <a href="https://www.label-qualirepar.fr/" target="_blank" rel="noopener noreferrer" className="block">
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <img src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png" alt="Label QualiRépar" className="max-w-[180px] mx-auto" />
                </div>
              </a>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[#1A5C3A] text-sm font-medium mb-4">
                <BadgeCheck className="text-[#2ECC71]" size={16} />
                Engagement qualité
              </div>
              <h2 className="text-2xl font-bold mb-4">Label <span className="text-[#2ECC71]">QualiRépar</span></h2>
              <p className="text-[#1A1A2E]/80 leading-relaxed mb-3">
                Tous nos magasins sont labellisés <strong>QualiRépar</strong>, le label officiel de l'État français pour les réparateurs de qualité.
              </p>
              <ul className="space-y-2 text-[#1A1A2E]/80 text-sm">
                <li className="flex items-start gap-2"><CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={16} />Des techniciens qualifiés et formés</li>
                <li className="flex items-start gap-2"><CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={16} />Des pièces de qualité</li>
                <li className="flex items-start gap-2"><CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={16} />Une garantie sur les réparations</li>
                <li className="flex items-start gap-2"><CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={16} />De 15€ à 60€ d'aide directe selon l'appareil</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AppointmentPage;
