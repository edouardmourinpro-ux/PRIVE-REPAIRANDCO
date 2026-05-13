import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  MapPin, Phone, Clock, Mail, CheckCircle, Loader2, Send
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
import { STORES } from '../data/stores';
import MiniSurvey from '../components/MiniSurvey';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const contactSchema = z.object({
  first_name: z.string().min(2, 'Entrez votre prénom'),
  name: z.string().min(2, 'Entrez votre nom'),
  email: z.string().email('Entrez un email valide'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Sélectionnez un sujet'),
  store: z.string().optional(),
  message: z.string().min(10, 'Votre message doit faire au moins 10 caractères'),
});

const ContactPage = () => {
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
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const r = await axios.post(`${API_URL}/api/contact`, data);
      setDemandId(r.data?.id || null);
      setIsSuccess(true);
      toast.success('Message envoyé avec succès !');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjects = [
    'Question sur une réparation',
    'Demande de devis',
    'Réclamation',
    'Partenariat',
    'Presse',
    'Autre',
  ];

  if (isSuccess) {
    return (
      <div data-testid="contact-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-lg mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#1A5C3A]" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#1A5C3A] mb-4">Message envoyé !</h1>
          <p className="text-lg text-[#1A5C3A]/80 mb-6">
            Un membre de notre équipe vous rappelle sous 15 minutes.
          </p>
          <MiniSurvey demandId={demandId} category="contact" />
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
    <div data-testid="contact-page">
      {/* Hero */}
      <section className="py-16 lg:py-20 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A5C3A] tracking-tight">
            <span className="text-[#1A5C3A]">Contactez</span>-nous
          </h1>
          <p className="mt-6 text-lg text-[#1A5C3A]/80 max-w-2xl leading-relaxed">
            Une question, une réclamation ou une demande de partenariat ? 
            Notre équipe est à votre écoute.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <Card className="card-repair">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">
                  Envoyez-nous un message
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name" className="text-[#1A5C3A] mb-2 block">Prénom <span className="text-red-500">*</span></Label>
                      <Input
                        {...register('first_name')}
                        data-testid="contact-first-name"
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
                        data-testid="contact-name"
                        placeholder="Votre nom"
                        className="form-input"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email" className="text-[#1A5C3A] mb-2 block">Email</Label>
                      <Input
                        {...register('email')}
                        data-testid="contact-email"
                        type="email"
                        placeholder="votre@email.com"
                        className="form-input"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-[#1A5C3A] mb-2 block">Téléphone (optionnel)</Label>
                      <Input
                        {...register('phone')}
                        data-testid="contact-phone"
                        placeholder="06 12 34 56 78"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-[#1A5C3A] mb-2 block">Sujet</Label>
                    <Select onValueChange={(value) => setValue('subject', value)}>
                      <SelectTrigger data-testid="contact-subject" className="form-select">
                        <SelectValue placeholder="Sélectionnez un sujet" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.subject && (
                      <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="store" className="text-[#1A5C3A] mb-2 block">Magasin concerné (optionnel)</Label>
                    <Select onValueChange={(value) => setValue('store', value)}>
                      <SelectTrigger data-testid="contact-store" className="form-select">
                        <SelectValue placeholder="Sélectionnez un magasin" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name} — {store.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-[#1A5C3A] mb-2 block">Message</Label>
                    <Textarea
                      {...register('message')}
                      data-testid="contact-message"
                      placeholder="Décrivez votre demande..."
                      className="form-textarea"
                      rows={5}
                    />
                    {errors.message && (
                      <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="contact-submit"
                    className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2" size={18} />
                        Envoyer le message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Stores */}
            <div>
              <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">
                Nos <span className="text-[#1A5C3A]">magasins</span>
              </h2>
              <div className="space-y-4">
                {STORES.map((store) => (
                  <Card key={store.id} className="border border-[#E8F5EE]">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-[#1A5C3A] mb-3">{store.name}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin size={16} className="text-[#1A5C3A] mt-0.5 flex-shrink-0" />
                          <span className="text-[#1A5C3A]/70">
                            {store.address}, {store.postalCode} {store.city}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-[#1A5C3A] flex-shrink-0" />
                          <a 
                            href={`tel:${store.phone.replace(/\s/g, '')}`}
                            className="text-[#1A5C3A]/70 hover:text-[#1A5C3A]"
                          >
                            {store.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-[#1A5C3A] flex-shrink-0" />
                          <span className="text-[#1A5C3A]/70">{store.hours}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6">
                <Link to="/magasins" className="text-[#1A5C3A] font-medium hover:text-[#1A5C3A]">
                  Voir tous les détails des magasins →
                </Link>
              </div>

              {/* B2B Note */}
              <Card className="mt-8 bg-[#E8F5EE] border-none">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-[#1A5C3A] mb-2">
                    Vous êtes une entreprise ?
                  </h3>
                  <p className="text-sm text-[#1A5C3A]/70 mb-4">
                    Pour les demandes B2B (flottes mobiles, devis groupé), 
                    consultez notre offre dédiée aux professionnels.
                  </p>
                  <Link to="/entreprises">
                    <Button 
                      variant="outline" 
                      className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-white rounded-full"
                      data-testid="contact-b2b-link"
                    >
                    Services Entreprise
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
