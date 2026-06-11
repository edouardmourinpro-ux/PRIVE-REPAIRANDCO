import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Recycle, Smartphone, ArrowRight, CheckCircle, Loader2, MapPin, BadgeCheck, Shield
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { STORES } from '../data/stores';
import MiniSurvey from '../components/MiniSurvey';
import { trackFormSubmission } from '../lib/analytics';
import SEO from '../components/SEO';
import SuccessCallout from '../components/SuccessCallout';
import { breadcrumbSchema } from '../lib/structuredData';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const buybackSchema = z.object({
  brand: z.string().min(1, 'Sélectionnez une marque'),
  model: z.string().min(1, 'Entrez le modèle'),
  condition: z.string().min(1, 'Sélectionnez l\'état'),
  first_name: z.string().min(2, 'Entrez votre prénom'),
  name: z.string().min(2, 'Entrez votre nom'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  store: z.string().min(1, 'Sélectionnez un magasin'),
});

const BuybackPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [demandId, setDemandId] = useState(null);
  const [submittedStoreId, setSubmittedStoreId] = useState(null);

  useEffect(() => {
    if (isSuccess) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSuccess]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(buybackSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const r = await axios.post(`${API_URL}/api/buyback`, data);
      setDemandId(r.data?.id || null);
      setSubmittedStoreId(data.store);
      setIsSuccess(true);
      trackFormSubmission('rachat', { brand: data.brand, store: data.store, condition: data.condition });
      toast.success('Demande d\'estimation envoyée !');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const brands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Oppo', 'Autre'];
  const conditions = [
    { value: 'bon', label: 'Bon état', description: 'Fonctionne parfaitement, traces d\'usure mineures' },
    { value: 'moyen', label: 'État moyen', description: 'Fonctionne, rayures visibles ou petits défauts' },
    { value: 'abime', label: 'Abîmé', description: 'Écran fissuré ou défauts majeurs' },
  ];

  if (isSuccess) {
    return (
      <div data-testid="buyback-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#1A5C3A]" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#1A5C3A] mb-4">Demande reçue !</h1>
          <div className="mb-6">
            <SuccessCallout storeId={submittedStoreId} variant="24h" />
          </div>
          <MiniSurvey demandId={demandId} category="rachat" />
          <div className="mt-8">
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] hover:text-[#1A5C3A] rounded-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="buyback-page">
      <SEO
        title="Rachat de smartphone — Estimation gratuite et reprise express"
        description="Vendez votre ancien smartphone Apple, Samsung, Xiaomi à Repair & Co. Estimation immédiate, paiement rapide, reprise en magasin. Donnez une seconde vie à votre appareil."
        path="/rachat"
        jsonLd={breadcrumbSchema([
          { name: 'Accueil', path: '/' },
          { name: 'Rachat', path: '/rachat' },
        ])}
      />
      {/* Hero */}
      <section className="py-16 lg:py-20 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A5C3A] tracking-tight">
            Donnez une seconde vie à vos <span className="text-[#1A5C3A]">appareils</span>
          </h1>
          <p className="mt-6 text-lg text-[#1A5C3A]/80 max-w-2xl leading-relaxed">
            Repair & Co rachète vos smartphones et vous propose des appareils 
            reconditionnés testés et garantis.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Sell Form */}
            <Card className="card-repair border-2 border-[#2ECC71]">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-[#E8F5EE] rounded-2xl flex items-center justify-center mb-6">
                  <Smartphone className="text-[#1A5C3A]" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-4">
                  Je vends mon appareil
                </h2>
                <p className="text-[#1A5C3A]/70 mb-6">
                  Votre vieux smartphone prend la poussière ? On l'évalue et on vous 
                  fait une offre de rachat immédiate.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="brand" className="text-[#1A5C3A] mb-2 block">Marque</Label>
                    <Select onValueChange={(value) => setValue('brand', value)}>
                      <SelectTrigger data-testid="buyback-brand" className="form-select">
                        <SelectValue placeholder="Sélectionnez une marque" />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
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
                      data-testid="buyback-model"
                      placeholder="Ex: iPhone 12, Galaxy S21..."
                      className="form-input"
                    />
                    {errors.model && (
                      <p className="text-red-500 text-sm mt-1">{errors.model.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-[#1A5C3A] mb-2 block">État de l'appareil</Label>
                    <Select onValueChange={(value) => setValue('condition', value)}>
                      <SelectTrigger data-testid="buyback-condition" className="form-select">
                        <SelectValue placeholder="Sélectionnez l'état" />
                      </SelectTrigger>
                      <SelectContent>
                        {conditions.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.condition && (
                      <p className="text-red-500 text-sm mt-1">{errors.condition.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="first_name" className="text-[#1A5C3A] mb-2 block">Prénom <span className="text-red-500">*</span></Label>
                    <Input
                      {...register('first_name')}
                      data-testid="buyback-first-name"
                      placeholder="Votre prénom"
                      className="form-input"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="name" className="text-[#1A5C3A] mb-2 block">Nom</Label>
                    <Input
                      {...register('name')}
                      data-testid="buyback-name"
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
                      data-testid="buyback-phone"
                      placeholder="06 12 34 56 78"
                      className="form-input"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="store" className="text-[#1A5C3A] mb-2 block">Magasin</Label>
                    <Select onValueChange={(value) => setValue('store', value)}>
                      <SelectTrigger data-testid="buyback-store" className="form-select">
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

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="buyback-submit"
                    className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] hover:text-[#1A5C3A] rounded-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Envoi...
                      </>
                    ) : (
                      <>
                        Obtenir une estimation
                        <ArrowRight className="ml-2" size={18} />
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-sm text-[#1A5C3A]/60 text-center">
                  Notre technicien vous contacte sous 24h avec une offre.
                </p>
              </CardContent>
            </Card>

            {/* Buy Refurbished */}
            <Card className="card-repair">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-[#E8F5EE] rounded-2xl flex items-center justify-center mb-6">
                  <Recycle className="text-[#1A5C3A]" size={28} />
                </div>
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-4">
                  J'achète un <span className="text-[#1A5C3A]">reconditionné</span>
                </h2>
                <p className="text-[#1A5C3A]/70 mb-4">
                  Smartphones reconditionnés, testés, validés et garantis. 
                  À retrouver directement en magasin.
                </p>
                <p className="text-[#1A5C3A]/70 mb-6">
                  Sans vous déplacer, sollicitez-nous et nous nous faisons fort de vous trouver 
                  votre smartphone au meilleur rapport qualité/prix.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#1A5C3A] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A5C3A]">Appareils testés et certifiés</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#1A5C3A] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A5C3A]">Garantie sur tous les produits</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#1A5C3A] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A5C3A]">Prix jusqu'à 50% moins cher</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#1A5C3A] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A5C3A]">Démarche éco-responsable</span>
                  </div>
                </div>

                {/* Guarantee badge */}
                <div className="p-4 bg-[#E8F5EE] rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <Shield className="text-[#1A5C3A] flex-shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-[#1A5C3A]">Nos smartphones sont garantis 24 mois.</p>
                      <p className="text-sm text-[#1A5C3A]/70 mt-1">
                        Une garantie étendue pour vous assurer une tranquillité totale.
                      </p>
                    </div>
                  </div>
                </div>

                <Link to="/magasins" data-testid="buyback-stores-link">
                  <Button 
                    variant="outline" 
                    className="w-full border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full"
                  >
                    <MapPin className="mr-2" size={18} />
                    Voir nos magasins
                  </Button>
                </Link>

                <p className="mt-4 text-sm text-[#1A5C3A]/60 text-center">
                  Sélection disponible en boutique — stock variable selon les magasins.
                </p>

                {/* Eco badge */}
                <div className="mt-6 p-4 bg-[#E8F5EE] rounded-xl">
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="text-[#1A5C3A] flex-shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-[#1A5C3A]">Éco-responsable</p>
                      <p className="text-sm text-[#1A5C3A]/70 mt-1">
                        En choisissant un reconditionné, vous participez à réduire les déchets électroniques.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* QualiRépar */}
      <section className="py-12 lg:py-16 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a 
            href="https://www.label-qualirepar.fr/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
              alt="Label QualiRépar"
              className="h-16 mx-auto mb-4 hover:opacity-80 transition-opacity"
            />
          </a>
          <h2 className="text-xl font-bold text-[#1A5C3A] mb-3">
            Label <span className="text-[#1A5C3A]">QualiRépar</span>
          </h2>
          <p className="text-[#1A5C3A]/80 max-w-xl mx-auto text-sm">
            Tous nos magasins sont labellisés QualiRépar. Bénéficiez d'une aide 
            entre 15 et 60€ sur vos réparations.
          </p>
        </div>
      </section>
    </div>
  );
};

export default BuybackPage;
