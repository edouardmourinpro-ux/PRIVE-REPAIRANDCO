import { useState } from 'react';
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

const quoteSchema = z.object({
  device_type: z.string().min(1, 'Sélectionnez un type d\'appareil'),
  brand: z.string().min(1, 'Sélectionnez une marque'),
  model: z.string().min(1, 'Entrez le modèle'),
  issue_types: z.array(z.string()).min(1, 'Sélectionnez au moins un problème'),
  other_issue: z.string().optional(),
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
  const [selectedIssues, setSelectedIssues] = useState([]);

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
      name: '',
      phone: '',
      email: '',
      store: '',
      preferred_time: '',
    },
  });

  const deviceType = watch('device_type');

  const deviceTypes = [
    { id: 'smartphone', label: 'Smartphone', icon: Smartphone },
    { id: 'tablette', label: 'Tablette', icon: Tablet },
    { id: 'pc', label: 'PC', icon: Laptop },
    { id: 'electromenager', label: 'Électroménager', icon: Coffee },
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
      await axios.post(`${API_URL}/api/quote`, data);
      setIsSuccess(true);
      toast.success('Demande envoyée avec succès !');
    } catch (error) {
      console.error('Quote submission error:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div data-testid="quote-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-[#e8f5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#005157]" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#111111] mb-4">Demande reçue !</h1>
          <p className="text-lg text-[#111111]/80 mb-8">
            Un technicien vous rappelle sous 15 minutes pour confirmer votre devis.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-[#005157] text-white hover:bg-[#86cbd4] rounded-full"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="quote-page">
      {/* Hero */}
      <section className="py-12 lg:py-16 hero-gradient">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            Devis <span className="text-[#005157]">gratuit</span>
          </h1>
          <p className="mt-4 text-lg text-[#111111]/80">
            Précisez-nous votre appareil et votre problème. 
            Nous vous rappelons sous 15 minutes.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress */}
          <div className="flex items-center justify-between mb-12">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div 
                  className={`step-indicator ${
                    step > s ? 'completed' : step === s ? 'active' : 'pending'
                  }`}
                >
                  {step > s ? <CheckCircle size={20} /> : s}
                </div>
                {s < 4 && (
                  <div 
                    className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                      step > s ? 'bg-[#86cbd4]' : 'bg-[#e8f5f5]'
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
                <h2 className="text-2xl font-bold text-[#111111] mb-6">
                  Quel type d'appareil ?
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {deviceTypes.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleDeviceSelect(id)}
                      data-testid={`device-${id}`}
                      className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                        deviceType === id
                          ? 'border-[#86cbd4] bg-[#e8f5f5]'
                          : 'border-[#e8f5f5] hover:border-[#86cbd4]/50'
                      }`}
                    >
                      <Icon 
                        className={`mx-auto mb-3 ${
                          deviceType === id ? 'text-[#005157]' : 'text-[#005157]'
                        }`} 
                        size={40} 
                      />
                      <span className="font-semibold text-[#005157]">{label}</span>
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
                <h2 className="text-2xl font-bold text-[#111111] mb-6">
                  Marque et modèle
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="brand" className="text-[#111111] mb-2 block">Marque</Label>
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
                    <Label htmlFor="model" className="text-[#111111] mb-2 block">Modèle</Label>
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
                <h2 className="text-2xl font-bold text-[#111111] mb-6">
                  Quel est le problème ?
                </h2>
                <div className="space-y-3">
                  {ISSUE_TYPES[deviceType]?.map((issue) => (
                    <label
                      key={issue}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                        selectedIssues.includes(issue)
                          ? 'border-[#86cbd4] bg-[#e8f5f5]'
                          : 'border-[#e8f5f5] hover:border-[#86cbd4]/50'
                      }`}
                    >
                      <Checkbox
                        checked={selectedIssues.includes(issue)}
                        onCheckedChange={() => handleIssueToggle(issue)}
                        data-testid={`issue-${issue.toLowerCase().replace(/\s/g, '-')}`}
                      />
                      <span className="text-[#111111]">{issue}</span>
                    </label>
                  ))}
                </div>
                {errors.issue_types && (
                  <p className="text-red-500 text-sm mt-2">{errors.issue_types.message}</p>
                )}
                
                {selectedIssues.includes('Autre') && (
                  <div className="mt-4">
                    <Label htmlFor="other_issue" className="text-[#111111] mb-2 block">
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
                <h2 className="text-2xl font-bold text-[#111111] mb-6">
                  Vos coordonnées
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-[#111111] mb-2 block">Nom complet</Label>
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
                    <Label htmlFor="phone" className="text-[#111111] mb-2 block">Téléphone</Label>
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
                    <Label htmlFor="email" className="text-[#111111] mb-2 block">Email</Label>
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
                    <Label htmlFor="store" className="text-[#111111] mb-2 block">Magasin</Label>
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
                    <Label htmlFor="preferred_time" className="text-[#111111] mb-2 block">
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
                  className="border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full"
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
                  className="bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full"
                >
                  Suivant
                  <ChevronRight size={18} className="ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="quote-submit"
                  className="bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full"
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
          <div className="mt-12 p-6 bg-[#e8f5f5] rounded-2xl">
            <div className="flex items-start gap-4">
              <BadgeCheck className="text-[#005157] flex-shrink-0" size={24} />
              <div>
                <p className="font-semibold text-[#111111]">Label QualiRépar</p>
                <p className="text-sm text-[#111111]/70 mt-1">
                  Bénéficiez d'une aide de 15 à 80€ déduite directement de votre facture.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuotePage;
