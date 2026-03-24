import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Building2, Users, Zap, Shield, BadgeCheck, CheckCircle, 
  Loader2, ArrowRight, Phone, Mail
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

const b2bSchema = z.object({
  first_name: z.string().min(2, 'Entrez votre prénom'),
  last_name: z.string().min(2, 'Entrez votre nom'),
  company: z.string().min(2, 'Entrez le nom de l\'entreprise'),
  email: z.string().email('Entrez un email valide'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  fleet_size: z.string().min(1, 'Sélectionnez une taille de flotte'),
  message: z.string().optional(),
});

const EnterprisePage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      await axios.post(`${API_URL}/api/b2b`, data);
      setIsSuccess(true);
      toast.success('Demande envoyée avec succès !');
    } catch (error) {
      console.error('B2B submission error:', error);
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

  const benefits = [
    {
      icon: Zap,
      title: 'Réparation en volume',
      description: 'Délais négociés et priorité de traitement pour vos flottes.'
    },
    {
      icon: Building2,
      title: 'Devis groupé sur mesure',
      description: 'Un interlocuteur dédié pour tous vos besoins.'
    },
    {
      icon: Users,
      title: 'Facturation entreprise',
      description: 'Bon de commande, facturation 30 jours.'
    },
    {
      icon: Shield,
      title: 'Techniciens certifiés',
      description: 'Pièces de qualité garantie, interventions professionnelles.'
    },
  ];

  if (isSuccess) {
    return (
      <div data-testid="b2b-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#2ECC71]" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#1A5C3A] mb-4">Demande reçue !</h1>
          <p className="text-lg text-[#1A1A2E]/80 mb-8">
            Notre équipe commerciale vous contactera rapidement pour discuter de vos besoins.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="enterprise-page">
      {/* Hero */}
      <section className="py-16 lg:py-24 bg-[#1A5C3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                Repair & Co Entreprises
              </h1>
              <p className="mt-6 text-xl text-white/80 leading-relaxed">
                Réparation de flottes mobiles, SAV externalisé, facturation entreprise.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <BadgeCheck className="text-[#2ECC71]" size={20} />
                  <span className="text-white">Label QualiRépar</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Building2 className="text-[#2ECC71]" size={20} />
                  <span className="text-white">5 magasins</span>
                </div>
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

      {/* Problem */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-[#1A5C3A] mb-6">
            Vos collaborateurs ont des appareils en panne ?
          </h2>
          <p className="text-lg text-[#1A1A2E]/80 max-w-2xl mx-auto">
            Chaque jour d'immobilisation coûte cher. Le remplacement coûte encore plus cher.
            <br />
            <strong className="text-[#1A5C3A]">Repair & Co a la solution.</strong>
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A5C3A] mb-12 text-center">
            Notre offre entreprise
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="card-repair">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center mb-4">
                    <benefit.icon className="text-[#2ECC71]" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A5C3A] mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-[#1A1A2E]/70 text-sm">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A5C3A] mb-4">
              Contactez notre équipe B2B
            </h2>
            <p className="text-lg text-[#1A1A2E]/70">
              Décrivez vos besoins, nous vous proposons une solution adaptée.
            </p>
          </div>

          <Card className="card-repair">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="first_name" className="text-[#1A1A2E] mb-2 block">Prénom</Label>
                    <Input
                      {...register('first_name')}
                      data-testid="b2b-first-name"
                      placeholder="Votre prénom"
                      className="form-input"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="last_name" className="text-[#1A1A2E] mb-2 block">Nom</Label>
                    <Input
                      {...register('last_name')}
                      data-testid="b2b-last-name"
                      placeholder="Votre nom"
                      className="form-input"
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="company" className="text-[#1A1A2E] mb-2 block">Société</Label>
                  <Input
                    {...register('company')}
                    data-testid="b2b-company"
                    placeholder="Nom de l'entreprise"
                    className="form-input"
                  />
                  {errors.company && (
                    <p className="text-red-500 text-sm mt-1">{errors.company.message}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email" className="text-[#1A1A2E] mb-2 block">Email professionnel</Label>
                    <Input
                      {...register('email')}
                      data-testid="b2b-email"
                      type="email"
                      placeholder="contact@entreprise.com"
                      className="form-input"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-[#1A1A2E] mb-2 block">Téléphone</Label>
                    <Input
                      {...register('phone')}
                      data-testid="b2b-phone"
                      placeholder="06 12 34 56 78"
                      className="form-input"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="fleet_size" className="text-[#1A1A2E] mb-2 block">
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
                    <p className="text-red-500 text-sm mt-1">{errors.fleet_size.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="message" className="text-[#1A1A2E] mb-2 block">
                    Message (optionnel)
                  </Label>
                  <Textarea
                    {...register('message')}
                    data-testid="b2b-message"
                    placeholder="Décrivez vos besoins..."
                    className="form-textarea"
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="b2b-submit"
                  className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full py-6 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Envoi...
                    </>
                  ) : (
                    <>
                      Envoyer ma demande
                      <ArrowRight className="ml-2" size={20} />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact info */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-8 text-center">
            <a href="tel:0466848079" className="flex items-center justify-center gap-2 text-[#1A5C3A] hover:text-[#2ECC71]">
              <Phone size={20} />
              04 66 84 80 79
            </a>
            <a href="mailto:edouardmourinpro@gmail.com" className="flex items-center justify-center gap-2 text-[#1A5C3A] hover:text-[#2ECC71]">
              <Mail size={20} />
              edouardmourinpro@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="py-16 bg-[#E8F5EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[#1A1A2E]/60 mb-6">Présents dans les enseignes</p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-[#1A5C3A] font-semibold">
            <span className="text-xl">Carrefour</span>
            <span className="text-xl">Intermarché</span>
            <span className="text-xl">Klepierre (Grand Sud)</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EnterprisePage;
