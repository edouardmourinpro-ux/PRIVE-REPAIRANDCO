import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Calendar, Clock, MapPin, Phone, ExternalLink, Loader2, CheckCircle
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

const API_URL = process.env.REACT_APP_BACKEND_URL;

const appointmentSchema = z.object({
  name: z.string().min(2, 'Entrez votre nom'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  email: z.string().email('Entrez un email valide'),
  store: z.string().min(1, 'Sélectionnez un magasin'),
  subject: z.string().min(1, 'Sélectionnez un sujet'),
  message: z.string().optional(),
});

const AppointmentPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedStore, setSelectedStore] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(appointmentSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/contact`, {
        ...data,
        subject: `Demande de RDV - ${data.subject}`,
      });
      setIsSuccess(true);
      toast.success('Demande de rendez-vous envoyée !');
    } catch (error) {
      console.error('Appointment submission error:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStoreChange = (value) => {
    setSelectedStore(value);
    setValue('store', value);
  };

  if (isSuccess) {
    return (
      <div data-testid="appointment-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-[#e8f5f5] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#005157]" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-[#005157] mb-4">Demande reçue !</h1>
          <p className="text-lg text-[#005157]/80 mb-8">
            Nous vous contacterons rapidement pour confirmer votre rendez-vous.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full"
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  const nimesStore = STORES.find(s => s.id === 'nimes-etoile');

  return (
    <div data-testid="appointment-page">
      {/* Hero */}
      <section className="py-16 lg:py-20 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#005157] tracking-tight">
            Prendre <span className="text-[#005157]">rendez-vous</span>
          </h1>
          <p className="mt-6 text-lg text-[#005157]/80 max-w-2xl leading-relaxed">
            Réservez un créneau pour votre réparation ou passez directement en magasin.
          </p>
          
          {/* Store selection dropdown */}
          <div className="mt-6 max-w-md">
            <Label className="text-[#005157] mb-2 block font-medium">Choisissez votre magasin</Label>
            <Select onValueChange={handleStoreChange} value={selectedStore}>
              <SelectTrigger data-testid="appointment-store-hero" className="form-select bg-white">
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
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Nîmes Étoile - Direct booking */}
            <Card className={`card-repair border-2 ${selectedStore === 'nimes-etoile' || !selectedStore ? 'border-[#86cbd4]' : 'border-[#e8f5f5]'}`}>
              <CardContent className="p-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#e8f5f5] rounded-full text-sm font-medium text-[#005157] mb-4">
                  <Calendar className="text-[#005157]" size={16} />
                  Réservation en ligne
                </div>
                <h2 className="text-2xl font-bold text-[#005157] mb-4">
                  Nîmes Étoile
                </h2>
                <p className="text-[#005157]/70 mb-6">
                  Réservez directement votre créneau en ligne pour notre magasin 
                  Carrefour Nîmes Étoile.
                </p>
                
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="text-[#005157]" size={18} />
                    <span>{nimesStore?.address}, {nimesStore?.postalCode} {nimesStore?.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="text-[#005157]" size={18} />
                    <span>{nimesStore?.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="text-[#005157]" size={18} />
                    <span>{nimesStore?.phone}</span>
                  </div>
                </div>

                <a 
                  href="https://rdv-nimes-etoile.preview.emergentagent.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="nimes-booking-link"
                >
                  <Button className="w-full bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full">
                    Réserver en ligne
                    <ExternalLink className="ml-2" size={18} />
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Other stores - Contact form */}
            <Card className={`card-repair ${selectedStore && selectedStore !== 'nimes-etoile' ? 'border-2 border-[#86cbd4]' : ''}`}>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-[#005157] mb-4">
                  Autres magasins
                </h2>
                <p className="text-[#005157]/70 mb-6">
                  La réservation en ligne pour tous nos magasins arrive bientôt. 
                  En attendant, contactez-nous via ce formulaire.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-[#005157] mb-2 block">Nom</Label>
                    <Input
                      {...register('name')}
                      data-testid="appointment-name"
                      placeholder="Votre nom"
                      className="form-input"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone" className="text-[#005157] mb-2 block">Téléphone</Label>
                      <Input
                        {...register('phone')}
                        data-testid="appointment-phone"
                        placeholder="06 12 34 56 78"
                        className="form-input"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-[#005157] mb-2 block">Email</Label>
                      <Input
                        {...register('email')}
                        data-testid="appointment-email"
                        type="email"
                        placeholder="votre@email.com"
                        className="form-input"
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="store" className="text-[#005157] mb-2 block">Magasin</Label>
                    <Select 
                      onValueChange={(value) => setValue('store', value)}
                      value={selectedStore && selectedStore !== 'nimes-etoile' ? selectedStore : undefined}
                    >
                      <SelectTrigger data-testid="appointment-store" className="form-select">
                        <SelectValue placeholder="Choisissez un magasin" />
                      </SelectTrigger>
                      <SelectContent>
                        {STORES.filter(s => s.id !== 'nimes-etoile').map((store) => (
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
                    <Label htmlFor="subject" className="text-[#005157] mb-2 block">Objet</Label>
                    <Select onValueChange={(value) => setValue('subject', value)}>
                      <SelectTrigger data-testid="appointment-subject" className="form-select">
                        <SelectValue placeholder="Sélectionnez" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Réparation smartphone">Réparation smartphone</SelectItem>
                        <SelectItem value="Réparation tablette">Réparation tablette</SelectItem>
                        <SelectItem value="Réparation PC">Réparation PC</SelectItem>
                        <SelectItem value="Électroménager">Électroménager</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.subject && (
                      <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-[#005157] mb-2 block">
                      Message (optionnel)
                    </Label>
                    <Textarea
                      {...register('message')}
                      data-testid="appointment-message"
                      placeholder="Précisez votre demande..."
                      className="form-textarea"
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="appointment-submit"
                    className="w-full bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full"
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
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Note */}
          <div className="mt-12 text-center">
            <p className="text-[#005157]/60">
              Vous pouvez également venir directement en magasin sans rendez-vous, 
              selon la disponibilité de nos techniciens.
            </p>
            <Link 
              to="/magasins" 
              className="inline-flex items-center mt-4 text-[#005157] font-medium hover:text-[#005157]"
            >
              Voir tous nos magasins
              <ExternalLink size={16} className="ml-1" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AppointmentPage;
