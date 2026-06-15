import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Smartphone, Tablet, Laptop, Coffee, ChevronRight, ChevronLeft, 
  CheckCircle, Loader2, BadgeCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { STORES, DEVICE_BRANDS, ISSUE_TYPES } from '../data/stores';
import MiniSurvey from '../components/MiniSurvey';
import { trackFormSubmission } from '../lib/analytics';
import SEO from '../components/SEO';
import SuccessCallout from '../components/SuccessCallout';
import { breadcrumbSchema } from '../lib/structuredData';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const quoteSchema = z.object({
  device_type: z.string().min(1, 'Sélectionnez un type d\'appareil'),
  brand: z.string().min(1, 'Sélectionnez une marque'),
  model: z.string().min(1, 'Entrez le modèle'),
  issue_types: z.array(z.string()).min(1, 'Sélectionnez au moins un problème'),
  other_issue: z.string().optional(),
  first_name: z.string().min(2, 'Entrez votre prénom'),
  name: z.string().min(2, 'Entrez votre nom'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  email: z.string().email('Entrez un email valide'),
  store: z.string().min(1, 'Sélectionnez un magasin'),
  preferred_time: z.string().optional(),
});

const QuotePage = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [demandId, setDemandId] = useState(null);
  const [submittedStoreId, setSubmittedStoreId] = useState(null);
  const [selectedIssues, setSelectedIssues] = useState([]);

  useEffect(() => {
    if (isSuccess) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSuccess]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      device_type: '',
      brand: '',
      model: '',
      issue_types: [],
      other_issue: '',
      first_name: '',
      name: '',
      phone: '',
      email: '',
      store: '',
      preferred_time: '',
    },
  });

  const deviceType = watch('device_type');

  const deviceTypes = [
    { id: 'smartphone', label: 'Smartphone', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/i65cqvig_Smartphone%20casse%CC%81.png' },
    { id: 'tablette', label: 'Tablette', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/i65cqvig_Smartphone%20casse%CC%81.png' },
    { id: 'pc', label: 'PC', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/lmcslwwi_Ordinateur%20e%CC%81cran%20casse%CC%81.png' },
    { id: 'electromenager', label: 'Électroménager', picto: 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/96fmgzu8_Machine%20a%CC%80%20cafe%CC%81.png' },
  ];

  const handleDeviceSelect = (type) => {
    setValue('device_type', type);
    setValue('brand', '');
    setValue('model', '');
    setSelectedIssues([]);
    setValue('issue_types', []);
  };

  const handleIssueToggle = (issue) => {
    const newIssues = selectedIssues.includes(issue)
      ? selectedIssues.filter(i => i !== issue)
      : [...selectedIssues, issue];
    setSelectedIssues(newIssues);
    setValue('issue_types', newIssues);
  };

  const nextStep = async () => {
    let fieldsToValidate = [];
    
    if (step === 1) fieldsToValidate = ['device_type'];
    if (step === 2) fieldsToValidate = ['brand', 'model'];
    if (step === 3) fieldsToValidate = ['issue_types'];
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const r = await axios.post(`${API_URL}/api/quote`, data);
      setDemandId(r.data?.id || null);
      setSubmittedStoreId(data.store);
      setIsSuccess(true);
      trackFormSubmission('devis', { store: data.store, device_type: data.device_type });
      toast.success('Demande envoyée avec succès !');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div data-testid="quote-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#1A5C3A]" size={48} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A5C3A] mb-4">📍 Prise en charge en cours... Restez près de votre téléphone !</h1>
          <div className="mb-6">
            <SuccessCallout storeId={submittedStoreId} />
          </div>
          <MiniSurvey demandId={demandId} category="devis" />
          <div className="mt-8">
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="quote-page">
      <SEO
        title="Devis de réparation gratuit en ligne | Repair & Co"
        description="Obtenez un devis gratuit pour réparer votre smartphone, tablette ou PC. Réponse rapide d'un conseiller, sans engagement."
        path="/devis"
        jsonLd={breadcrumbSchema([
          { name: 'Accueil', path: '/' },
          { name: 'Devis gratuit', path: '/devis' },
        ])}
      />
      {/* Hero */}
      <section className="py-12 lg:py-16 hero-gradient">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A5C3A] tracking-tight">
            Devis <span className="text-[#1A5C3A]">gratuit</span>
          </h1>
          <p className="mt-4 text-lg text-[#1A5C3A]/80">
            Précisez-nous votre appareil et votre problème. 
            Nous vous rappelons sous 15 minutes.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress */}
          <div className="flex items-center justify-between mb-12 overflow-hidden">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`step-indicator flex-shrink-0 ${
                    step > s ? 'completed' : step === s ? 'active' : 'pending'
                  }`}
                >
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                {s < 4 && (
                  <div 
                    className={`w-10 sm:w-24 h-1 mx-1 sm:mx-2 rounded ${
                      step > s ? 'bg-[#1A5C3A]' : 'bg-[#E8F5EE]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Device Type */}
            {step === 1 && (
              <div className="animate-fade-in-up" data-testid="quote-step-1">
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">
                  Quel type d'appareil ?
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {deviceTypes.map(({ id, label, picto }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleDeviceSelect(id)}
                      data-testid={`device-${id}`}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                        deviceType === id
                          ? 'border-[#2ECC71] bg-[#E8F5EE]'
                          : 'border-[#E8F5EE] hover:border-[#2ECC71]/50'
                      }`}
                    >
                      <img src={picto} alt={label} className="mx-auto mb-3 w-10 h-10 object-contain" />
                      <span className="font-semibold text-[#1A5C3A]">{label}</span>
                    </button>
                  ))}
                </div>
                {errors.device_type && (
                  <p className="text-red-500 text-sm mt-2">{errors.device_type.message}</p>
                )}
              </div>
            )}

            {/* Step 2: Brand & Model */}
            {step === 2 && (
              <div className="animate-fade-in-up" data-testid="quote-step-2">
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">
                  Marque et modèle
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="brand" className="text-[#1A5C3A] mb-2 block">Marque</Label>
                    <Select onValueChange={(value) => setValue('brand', value)}>
                      <SelectTrigger data-testid="brand-select" className="form-select">
                        <SelectValue placeholder="Sélectionnez une marque" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEVICE_BRANDS[deviceType]?.map((brand) => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.brand && (
                      <p className="text-red-500 text-sm mt-1">{errors.brand.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="model" className="text-[#1A5C3A] mb-2 block">Modèle</Label>
                    <Input
                      {...register('model')}
                      data-testid="model-input"
                      placeholder="Ex: iPhone 14 Pro, Galaxy S23..."
                      className="form-input"
                    />
                    {errors.model && (
                      <p className="text-red-500 text-sm mt-1">{errors.model.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Issue Type */}
            {step === 3 && (
              <div className="animate-fade-in-up" data-testid="quote-step-3">
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">
                  Quel est le problème ?
                </h2>
                <div className="space-y-3">
                  {ISSUE_TYPES[deviceType]?.map((issue) => (
                    <label
                      key={issue}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        selectedIssues.includes(issue)
                          ? 'border-[#2ECC71] bg-[#E8F5EE]'
                          : 'border-[#E8F5EE] hover:border-[#2ECC71]/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedIssues.includes(issue)}
                        onCheckedChange={() => handleIssueToggle(issue)}
                        data-testid={`issue-${issue.toLowerCase().replace(/\s/g, '-')}`}
                      />
                      <span className="text-[#1A5C3A]">{issue}</span>
                    </label>
                  ))}
                </div>
                {errors.issue_types && (
                  <p className="text-red-500 text-sm mt-2">{errors.issue_types.message}</p>
                )}
                
                {selectedIssues.includes('Autre') && (
                  <div className="mt-4">
                    <Label htmlFor="other_issue" className="text-[#1A5C3A] mb-2 block">
                      Décrivez le problème
                    </Label>
                    <Textarea
                      {...register('other_issue')}
                      data-testid="other-issue-input"
                      placeholder="Décrivez le problème rencontré..."
                      className="form-textarea"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Contact Info */}
            {step === 4 && (
              <div className="animate-fade-in-up" data-testid="quote-step-4">
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">
                  Vos coordonnées
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="first_name" className="text-[#1A5C3A] mb-2 block">Prénom <span className="text-red-500">*</span></Label>
                    <Input
                      {...register('first_name')}
                      data-testid="first-name-input"
                      placeholder="Votre prénom"
                      className="form-input"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-[#1A5C3A] mb-2 block">Nom <span className="text-red-500">*</span></Label>
                    <Input
                      {...register('name')}
                      data-testid="name-input"
                      placeholder="Votre nom"
                      className="form-input"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[#1A5C3A] mb-2 block">Téléphone</Label>
                    <Input
                      {...register('phone')}
                      data-testid="phone-input"
                      placeholder="06 12 34 56 78"
                      className="form-input"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-[#1A5C3A] mb-2 block">Email</Label>
                    <Input
                      {...register('email')}
                      data-testid="email-input"
                      type="email"
                      placeholder="votre@email.com"
                      className="form-input"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="store" className="text-[#1A5C3A] mb-2 block">Magasin</Label>
                    <Select onValueChange={(value) => setValue('store', value)}>
                      <SelectTrigger data-testid="store-select" className="form-select">
                        <SelectValue placeholder="Choisissez un magasin" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name} — {store.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.store && (
                      <p className="text-red-500 text-sm mt-1">{errors.store.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="preferred_time" className="text-[#1A5C3A] mb-2 block">
                      Créneau souhaité (optionnel)
                    </Label>
                    <Input
                      {...register('preferred_time')}
                      data-testid="time-input"
                      placeholder="Ex: Mardi matin, Samedi après-midi..."
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-10">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  data-testid="quote-prev"
                  className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full"
                >
                  <ChevronLeft size={18} className="mr-1" />
                  Précédent
                </Button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  data-testid="quote-next"
                  className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] hover:text-[#1A5C3A] rounded-full"
                >
                  Suivant
                  <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="quote-submit"
                  className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] hover:text-[#1A5C3A] rounded-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Envoi...
                    </>
                  ) : (
                    'Envoyer ma demande'
                  )}
                </Button>
              )}
            </div>
          </form>

          {/* QualiRépar Note */}
          <div className="mt-12 p-6 bg-[#E8F5EE] rounded-2xl">
            <div className="flex items-start gap-4">
              <BadgeCheck className="text-[#1A5C3A] flex-shrink-0" size={24} />
              <div>
                <p className="font-semibold text-[#1A5C3A]">Label QualiRépar</p>
                <p className="text-sm text-[#1A5C3A]/70 mt-1">
                  Bénéficiez d'une aide de 15 à 60€ déduite directement de votre facture.
                </p>
              </div>
            </div>
          </div>
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

export default QuotePage;
