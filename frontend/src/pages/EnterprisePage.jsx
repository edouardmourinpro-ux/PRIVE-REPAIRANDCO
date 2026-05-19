import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, Zap, Shield, BadgeCheck, CheckCircle, 
  Loader2, ArrowRight, Phone, Mail, Download, Gift, Wrench,
  Truck, CreditCard, Award
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import MiniSurvey from '../components/MiniSurvey';
import { trackFormSubmission } from '../lib/analytics';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const b2bSchema = z.object({
  first_name: z.string().min(2, 'Entrez votre prénom'),
  last_name: z.string().min(2, 'Entrez votre nom'),
  company: z.string().min(2, 'Entrez le nom de l\'entreprise'),
  email: z.string().email('Entrez un email valide'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  fleet_size: z.string().min(1, 'Sélectionnez une taille de flotte'),
  need_type: z.string().min(1, 'Sélectionnez un besoin'),
  message: z.string().optional(),
});

const EnterprisePage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [demandId, setDemandId] = useState(null);

  useEffect(() => {
    if (isSuccess) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSuccess]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(b2bSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const r = await axios.post(`${API_URL}/api/b2b`, data);
      setDemandId(r.data?.id || null);
      setIsSuccess(true);
      trackFormSubmission('b2b', { fleet_size: data.fleet_size, need_type: data.need_type });
      toast.success('Demande envoyée avec succès !');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fleetSizes = [
    { value: '<10', label: 'Moins de 10 appareils' },
    { value: '10-50', label: '10 à 50 appareils' },
    { value: '50-200', label: '50 à 200 appareils' },
    { value: '200+', label: 'Plus de 200 appareils' },
  ];

  const needTypes = [
    { value: 'flotte-mobile', label: 'Besoin réparation flotte mobile' },
    { value: 'flotte-informatique', label: 'Besoin réparation flotte informatique' },
    { value: 'autres', label: 'Autres' },
    { value: 'programme-rse', label: 'Programme RSE collaborateurs' },
  ];

  const adaptedSolutions = [
    { icon: Wrench, title: 'Maintenances & SAV', description: 'Interventions régulières et support technique' },
    { icon: Truck, title: 'Logistique', description: 'Collecte et livraison de vos appareils' },
    { icon: CreditCard, title: 'Financements', description: 'Solutions de financement adaptées' },
    { icon: Building2, title: 'Reconditionnés', description: 'Ventes de mobiles reconditionnés' },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navItems = [
    { id: 'offres', label: 'Offres entreprises' },
    { id: 'programme-rse', label: 'Programme RSE collaborateurs' },
    { id: 'contact-b2b', label: 'Contact', highlight: true },
  ];

  if (isSuccess) {
    return (
      <div data-testid="b2b-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#1A5C3A]" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#1A5C3A] mb-4">Demande reçue !</h1>
          <p className="text-lg text-[#1A5C3A]/80 mb-6">
            Notre équipe commerciale vous contactera rapidement pour discuter de vos besoins.
          </p>
          <MiniSurvey demandId={demandId} category="entreprise" />
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
    <div data-testid="enterprise-page">
      {/* Hero */}
      <section className="py-12 lg:py-16 bg-[#1A5C3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Repair & Co — <span className="text-[#2ECC71]">Services Entreprise</span>
              </h1>
              <p className="mt-4 text-xl text-white/90 leading-relaxed">
                Réparation de flottes mobiles, SAV externalisé, Programme RSE avantages collaborateurs, rachat et/ou vente de smartphones reconditionnés, …
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                  <BadgeCheck className="text-[#2ECC71]" size={18} />
                  <span className="text-white text-sm">Label QualiRépar</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
                  <Building2 className="text-[#2ECC71]" size={18} />
                  <span className="text-white text-sm">9 magasins</span>
                </div>
              </div>
              {/* Internal nav */}
              <div className="mt-8 flex flex-wrap gap-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      item.highlight
                        ? 'bg-[#2ECC71] text-white hover:bg-[#2ECC71]/90'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    data-testid={`b2b-nav-${item.id}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="https://images.pexels.com/photos/7988665/pexels-photo-7988665.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Équipe entreprise - gestion de flotte mobile"
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Solutions adaptées */}
      <section id="offres" className="py-12 lg:py-16 section-mint scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#1A5C3A] mb-3">
              Des réponses adaptées à vos <span className="text-[#1A5C3A]">besoins</span>
            </h2>
            <p className="text-[#1A5C3A]/70 max-w-2xl mx-auto">
              L'offre Repair&Co s'adapte à votre entreprise : maintenances, SAV, réparations, 
              logistique, Programme RSE avantages collaborateurs, ventes et financements de mobiles reconditionnés.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {adaptedSolutions.map((solution, index) => (
              <Card key={solution.title} className="bg-white">
                <CardContent className="p-5 text-center">
                  <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center mx-auto mb-3">
                    <solution.icon className="text-[#1A5C3A]" size={24} />
                  </div>
                  <h3 className="font-semibold text-[#1A5C3A] mb-1">{solution.title}</h3>
                  <p className="text-[#1A5C3A]/70 text-sm">{solution.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Programme RSE REPAIR */}
      <section id="programme-rse" className="py-12 lg:py-16 bg-white scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8F5EE] rounded-full text-[#1A5C3A] text-sm font-medium mb-4">
                <Gift className="text-[#1A5C3A]" size={16} />
                Programme dédié
              </div>
              <h2 className="text-2xl font-bold text-[#1A5C3A] mb-4">
                Programme RSE <span className="text-[#1A5C3A]">REPAIR</span>
              </h2>
              <p className="text-[#1A5C3A]/80 leading-relaxed mb-4">
                Nous accompagnons les entreprises dans la mise en œuvre concrète de leur politique RSE 
                et de leur marque employeur auprès de leurs collaborateurs, grâce à un programme dédié. 
                Notre objectif : encourager des comportements plus responsables et promouvoir le réflexe 
                « réparer plutôt que jeter ».
              </p>
              <p className="text-[#1A5C3A]/80 leading-relaxed mb-4">
                Offrez à vos collaborateurs tous les avantages du club Repair avec votre code entreprise 
                et faites-leur bénéficier de <strong>-25 à -50%</strong> sur toutes leurs réparations. 
                Une autre façon de soutenir « Le réparer plutôt que jeter » et d'illustrer votre politique RSE !
              </p>
              <p className="text-[#1A5C3A]/80 leading-relaxed mb-6">
                REPAIR&CO étant labellisé QUALIREPAR, les collaborateurs peuvent en plus cumuler sur leurs 
                futures réparations des réductions allant de <strong>15 à 60 euros</strong> selon la nature 
                du produit réparé.
              </p>

              <Button 
                onClick={() => scrollToSection('contact-b2b')}
                className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] hover:text-[#1A5C3A] rounded-full"
                data-testid="rse-join-btn"
              >
                Je souhaite le rejoindre
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>

            <Card className="bg-[#E8F5EE] border-none">
              <CardContent className="p-6">
                <Award className="text-[#1A5C3A] mb-4" size={40} />
                <h3 className="text-xl font-bold text-[#1A5C3A] mb-3">
                  Inscription gratuite
                </h3>
                <p className="text-[#1A5C3A]/80 text-sm leading-relaxed mb-4">
                  Inscrivez votre entreprise au programme RSE REPAIR et offrez à vos collaborateurs 
                  des avantages exclusifs sur toutes leurs réparations.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="text-[#1A5C3A]" size={16} />
                    <span className="text-[#1A5C3A]/80">Aucun engagement</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="text-[#1A5C3A]" size={16} />
                    <span className="text-[#1A5C3A]/80">Mise en place rapide</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="text-[#1A5C3A]" size={16} />
                    <span className="text-[#1A5C3A]/80">Valable dans tous nos magasins</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="text-[#1A5C3A]" size={16} />
                    <span className="text-[#1A5C3A]/80">Cumul possible avec le bonus QualiRépar</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    variant="outline"
                    className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-white rounded-full w-full"
                    data-testid="download-brochure"
                    onClick={() => alert('Téléchargement de la plaquette (à configurer)')}
                  >
                    <Download size={18} className="mr-2" />
                    Télécharger notre plaquette
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Form */}
      <section id="contact-b2b" className="py-12 lg:py-16 bg-white scroll-mt-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1A5C3A] mb-3">
              Contactez notre équipe <span className="text-[#1A5C3A]">B2B</span>
            </h2>
            <p className="text-[#1A5C3A]/70">
              Décrivez vos besoins, nous vous proposons une solution adaptée.
            </p>
          </div>

          <Card className="card-repair">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="first_name" className="text-[#1A5C3A] mb-2 block text-sm">Prénom</Label>
                    <Input
                      {...register('first_name')}
                      data-testid="b2b-first-name"
                      placeholder="Votre prénom"
                      className="form-input"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="last_name" className="text-[#1A5C3A] mb-2 block text-sm">Nom</Label>
                    <Input
                      {...register('last_name')}
                      data-testid="b2b-last-name"
                      placeholder="Votre nom"
                      className="form-input"
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="company" className="text-[#1A5C3A] mb-2 block text-sm">Société</Label>
                  <Input
                    {...register('company')}
                    data-testid="b2b-company"
                    placeholder="Nom de l'entreprise"
                    className="form-input"
                  />
                  {errors.company && (
                    <p className="text-red-500 text-xs mt-1">{errors.company.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="email" className="text-[#1A5C3A] mb-2 block text-sm">Email professionnel</Label>
                    <Input
                      {...register('email')}
                      data-testid="b2b-email"
                      type="email"
                      placeholder="contact@entreprise.com"
                      className="form-input"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[#1A5C3A] mb-2 block text-sm">Téléphone</Label>
                    <Input
                      {...register('phone')}
                      data-testid="b2b-phone"
                      placeholder="06 12 34 56 78"
                      className="form-input"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="need_type" className="text-[#1A5C3A] mb-2 block text-sm">
                    Type de besoin
                  </Label>
                  <Select onValueChange={(value) => setValue('need_type', value)}>
                    <SelectTrigger data-testid="b2b-need-type" className="form-select">
                      <SelectValue placeholder="Sélectionnez votre besoin" />
                    </SelectTrigger>
                    <SelectContent>
                      {needTypes.map((need) => (
                        <SelectItem key={need.value} value={need.value}>
                          {need.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.need_type && (
                    <p className="text-red-500 text-xs mt-1">{errors.need_type.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fleet_size" className="text-[#1A5C3A] mb-2 block text-sm">
                    Taille de flotte estimée
                  </Label>
                  <Select onValueChange={(value) => setValue('fleet_size', value)}>
                    <SelectTrigger data-testid="b2b-fleet-size" className="form-select">
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      {fleetSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.fleet_size && (
                    <p className="text-red-500 text-xs mt-1">{errors.fleet_size.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="message" className="text-[#1A5C3A] mb-2 block text-sm">
                    Message (optionnel)
                  </Label>
                  <Textarea
                    {...register('message')}
                    data-testid="b2b-message"
                    placeholder="Décrivez vos besoins..."
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="b2b-submit"
                  className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] hover:text-[#1A5C3A] rounded-full py-5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Envoi...
                    </>
                  ) : (
                    <>
                      Envoyer ma demande
                      <ArrowRight className="ml-2" size={18} />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact info */}
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-6 text-center">
            <a href="tel:0467716769" className="flex items-center justify-center gap-2 text-[#1A5C3A] hover:text-[#2ECC71] text-sm">
              <Phone size={18} />
              04 67 71 67 69
            </a>
            <a href="mailto:contact@repair-and-co.fr" className="flex items-center justify-center gap-2 text-[#1A5C3A] hover:text-[#2ECC71] text-sm">
              <Mail size={18} />
              contact@repair-and-co.fr
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EnterprisePage;
