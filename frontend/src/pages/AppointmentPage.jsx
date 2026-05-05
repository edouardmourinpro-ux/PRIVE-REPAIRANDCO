import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Calendar, Clock, MapPin, Phone, Loader2, CheckCircle, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { STORES } from '../data/stores';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const V3_PICTO = 'https://customer-assets.emergentagent.com/job_repair-south-france/artifacts/n5lml0g5_V3%20-%20logos%20groupe%CC%81s.png';

const appointmentSchema = z.object({
  name: z.string().min(2, 'Entrez votre nom'),
  phone: z.string().min(10, 'Entrez un numéro valide'),
  email: z.string().email('Entrez un email valide'),
  subject: z.string().min(1, 'Sélectionnez un sujet'),
  message: z.string().optional(),
});

const AppointmentPage = () => {
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedStore = STORES.find(s => s.id === selectedStoreId);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(appointmentSchema),
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/contact`, { ...data, store: selectedStoreId, subject: `Demande de RDV - ${data.subject}` });
      setIsSuccess(true);
      toast.success('Demande de rendez-vous envoyée !');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div data-testid="appointment-success" className="min-h-[70vh] flex items-center justify-center py-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-[#E8F5EE] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-[#2ECC71]" size={48} />
          </div>
          <h1 className="text-3xl font-bold mb-4">Demande reçue !</h1>
          <p className="text-lg text-[#1A1A2E]/80 mb-8">Nous vous contacterons rapidement pour confirmer votre rendez-vous.</p>
          <Button onClick={() => window.location.href = '/'} className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full">Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="appointment-page">
      {/* Hero with picto */}
      <section className="py-12 lg:py-16 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Prendre <span className="text-[#2ECC71]">rendez-vous</span>
              </h1>
              <p className="mt-4 text-lg text-[#1A1A2E]/80 max-w-lg">
                Choisissez votre magasin et réservez votre créneau pour une réparation rapide et garantie.
              </p>
            </div>
            <div className="flex justify-center">
              <img src={V3_PICTO} alt="Appareils réparables - smartphone, électroménager, trottinette, vélo, console, aspirateur" className="max-w-xs w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Store Selection */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="card-repair border-2 border-[#E8F5EE]">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="text-[#1A5C3A]" size={28} />
                <h2 className="text-2xl font-bold">Pour quel magasin souhaitez-vous prendre rendez-vous ?</h2>
              </div>
              
              <Select onValueChange={(value) => setSelectedStoreId(value)} value={selectedStoreId}>
                <SelectTrigger data-testid="appointment-store-select" className="form-select text-base py-4">
                  <SelectValue placeholder="Choisissez votre magasin" />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} — {store.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Content shown only after selection */}
          {selectedStore ? (
            <div className="mt-8 animate-fade-in-up">
              {/* Store Info */}
              <Card className="card-repair mb-8">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">
                    {selectedStore.id === 'nimes-etoile' ? (
                      <><strong>Carrefour Nîmes Étoile</strong> — {selectedStore.name}</>
                    ) : (
                      selectedStore.name
                    )}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-[#1A1A2E]/80">
                    <div className="flex items-start gap-2">
                      <MapPin className="text-[#1A5C3A] flex-shrink-0 mt-0.5" size={16} />
                      <span>{selectedStore.address}, {selectedStore.postalCode} {selectedStore.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="text-[#1A5C3A] flex-shrink-0" size={16} />
                      <span>{selectedStore.hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="text-[#1A5C3A] flex-shrink-0" size={16} />
                      <a href={`tel:${selectedStore.phone.replace(/\s/g, '')}`} className="hover:text-[#1A5C3A]">{selectedStore.phone}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="text-[#1A5C3A] flex-shrink-0" size={16} />
                      <a href={`mailto:${selectedStore.email}`} className="hover:text-[#1A5C3A]">{selectedStore.email}</a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RDV Form */}
              <Card className="card-repair">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-6">Demande de rendez-vous</h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Nom</Label>
                        <Input {...register('name')} data-testid="appointment-name" placeholder="Votre nom" className="form-input" />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                      </div>
                      <div>
                        <Label className="text-[#1A1A2E] mb-2 block">Téléphone</Label>
                        <Input {...register('phone')} data-testid="appointment-phone" placeholder="06 12 34 56 78" className="form-input" />
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
                      </div>
                    </div>
                    <div>
                      <Label className="text-[#1A1A2E] mb-2 block">Email</Label>
                      <Input {...register('email')} data-testid="appointment-email" type="email" placeholder="votre@email.com" className="form-input" />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <Label className="text-[#1A1A2E] mb-2 block">Objet</Label>
                      <Select onValueChange={(value) => setValue('subject', value)}>
                        <SelectTrigger data-testid="appointment-subject" className="form-select">
                          <SelectValue placeholder="Type de réparation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Réparation smartphone">Réparation smartphone</SelectItem>
                          <SelectItem value="Réparation tablette">Réparation tablette</SelectItem>
                          <SelectItem value="Réparation PC">Réparation PC</SelectItem>
                          <SelectItem value="Électroménager">Électroménager</SelectItem>
                          <SelectItem value="Vélo / Trottinette">Vélo / Trottinette</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.subject && <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>}
                    </div>
                    <div>
                      <Label className="text-[#1A1A2E] mb-2 block">Message (optionnel)</Label>
                      <Textarea {...register('message')} data-testid="appointment-message" placeholder="Précisez votre demande..." className="form-textarea" rows={3} />
                    </div>
                    <Button type="submit" disabled={isSubmitting} data-testid="appointment-submit" className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full py-5">
                      {isSubmitting ? (<><Loader2 className="animate-spin mr-2" size={18} /> Envoi...</>) : 'Envoyer ma demande de rendez-vous'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <p className="mt-6 text-center text-[#1A1A2E]/60 text-sm">
                Vous pouvez également venir directement en magasin sans rendez-vous, selon la disponibilité de nos techniciens.
              </p>
            </div>
          ) : (
            <div className="mt-8 text-center py-12 bg-[#E8F5EE] rounded-2xl">
              <Calendar className="text-[#1A5C3A]/30 mx-auto mb-4" size={48} />
              <p className="text-[#1A1A2E]/50 text-lg">Sélectionnez un magasin ci-dessus pour accéder au formulaire de prise de rendez-vous.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AppointmentPage;
