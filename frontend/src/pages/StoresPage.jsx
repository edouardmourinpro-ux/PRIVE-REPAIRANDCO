import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  MapPin, Phone, Clock, Star, ExternalLink, Navigation, BadgeCheck,
  Search, Truck, MessageCircle, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const StoresPage = () => {
  const [postalCode, setPostalCode] = useState('');
  const handleSearch = (e) => { e.preventDefault(); alert(`Recherche du magasin le plus proche du code postal ${postalCode}`); };

  return (
    <div data-testid="stores-page">
      <Helmet><title>Nos magasins — Repair & Co | Nîmes, Montpellier, Béziers</title></Helmet>

      <section className="py-10 lg:py-14 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
            Nos <span className="text-[#005157]">magasins</span> — Près de chez vous
          </h1>
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <form onSubmit={handleSearch} className="max-w-md">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#111111]/40" size={18} />
                  <Input type="text" placeholder="Votre code postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="pl-10 form-input" data-testid="postal-code-input" />
                </div>
                <Button type="submit" className="bg-[#005157] text-white hover:bg-[#005157]/90 rounded-xl" data-testid="postal-code-search">Trouver</Button>
              </div>
            </form>
            <Link to="/rendez-vous">
              <Button className="bg-[#005157] text-white hover:bg-[#005157]/90 rounded-full" data-testid="stores-hero-rdv">Prendre RDV <ArrowRight size={18} className="ml-2" /></Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="border-2 border-[#005157]/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#e8f5f5] rounded-xl flex items-center justify-center mb-4"><MapPin className="text-[#005157]" size={24} /></div>
                <h2 className="text-xl font-bold text-[#111111] mb-3">Faire réparer en <span className="text-[#005157]">atelier</span></h2>
                <p className="text-[#111111]/70 text-sm leading-relaxed">Retrouvez-nous directement dans nos boutiques ateliers. Nos techniciens vous accueillent, diagnostiquent votre appareil et effectuent la réparation sur place dans les meilleurs délais.</p>
              </CardContent>
            </Card>
            <Card className="border border-[#e8f5f5]">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#e8f5f5] rounded-xl flex items-center justify-center mb-4"><Truck className="text-[#005157]" size={24} /></div>
                <h2 className="text-xl font-bold text-[#111111] mb-3">Faire réparer en ligne — <span className="text-[#005157]">Clic&Repair</span></h2>
                <p className="text-[#111111]/70 text-sm leading-relaxed">Pas d'atelier près de chez vous ? Aucun souci ! Grâce à notre service <strong>Clic&Repair</strong> : obtenez un devis gratuit en ligne, envoyez votre appareil gratuitement par voie postale, recevez-le réparé chez vous en toute sécurité.</p>
                <Link to="/devis" className="inline-flex items-center mt-4 text-[#005157] font-medium hover:underline text-sm">Demander un devis en ligne <ExternalLink size={14} className="ml-1" /></Link>
              </CardContent>
            </Card>
          </div>

          <a href="#qualirepar-section" className="inline-flex items-center gap-2 mb-8 text-sm text-[#005157] hover:underline">
            <BadgeCheck size={18} className="text-[#005157]" /> Tous nos magasins sont labellisés QualiRépar — En savoir plus
          </a>

          <h2 className="text-2xl font-bold text-[#111111] mb-6">Nos <span className="text-[#005157]">ateliers</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STORES.map((store) => (
              <Card key={store.id} id={store.id} className="store-card scroll-mt-24" data-testid={`store-detail-${store.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#111111]">{store.name}</h3>
                      <p className="text-[#111111]/60 text-sm">{store.location}</p>
                    </div>
                    {store.rating && (
                      <div className="flex items-center gap-1 bg-[#e8f5f5] px-2 py-1 rounded-full">
                        <Star className="text-[#005157] fill-[#005157]" size={14} />
                        <span className="text-sm font-medium text-[#111111]">{store.rating}</span>
                        {store.reviewsCount && <span className="text-[#111111]/60 text-xs">· {store.reviewsCount}</span>}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-sm text-[#111111]/70 mb-4">
                    <div className="flex items-start gap-2"><MapPin size={16} className="text-[#005157] mt-0.5 flex-shrink-0" /><span>{store.address}, {store.postalCode} {store.city}</span></div>
                    <div className="flex items-center gap-2"><Clock size={16} className="text-[#005157] flex-shrink-0" /><span>{store.hours}</span></div>
                    <div className="flex items-center gap-2"><Phone size={16} className="text-[#005157] flex-shrink-0" /><a href={`tel:${store.phone.replace(/\s/g, '')}`} className="hover:text-[#005157]">{store.phone}</a></div>
                  </div>
                  {store.qualirepar && <div className="qualirepar-badge mb-4"><BadgeCheck size={16} className="text-[#005157]" /><span>QualiRépar</span></div>}
                  {store.testimonial && (
                    <div className="bg-[#e8f5f5]/50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-[#111111]/80 italic">"{store.testimonial.text}"</p>
                      <p className="text-xs text-[#005157] mt-1 font-medium">— {store.testimonial.author}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link to="/rendez-vous"><Button size="sm" className="bg-[#005157] text-white hover:bg-[#005157]/90 rounded-full text-sm" data-testid={`store-appointment-${store.id}`}>Prendre RDV</Button></Link>
                    <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full text-sm" data-testid={`store-directions-${store.id}`}><Navigation size={14} className="mr-1" /> Itinéraire</Button></a>
                    {store.whatsapp && <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="outline" className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 rounded-full text-sm" data-testid={`store-whatsapp-${store.id}`}><MessageCircle size={14} className="mr-1" /> WhatsApp</Button></a>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="qualirepar-section" className="py-10 lg:py-14 bg-[#e8f5f5] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a href="https://www.label-qualirepar.fr/" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png" alt="Label QualiRépar" className="h-16 mx-auto mb-4 hover:opacity-80 transition-opacity" />
          </a>
          <h2 className="text-xl font-bold text-[#111111] mb-3">Tous nos magasins sont labellisés <span className="text-[#005157]">QualiRépar</span></h2>
          <p className="text-[#111111]/80 max-w-xl mx-auto text-sm">Bénéficiez d'une aide de 15€ à 80€ selon l'appareil réparé, directement déduite de votre facture.</p>
          <a href="https://www.label-qualirepar.fr/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-4 text-[#005157] font-medium hover:underline text-sm">En savoir plus <ExternalLink size={14} className="ml-1" /></a>
        </div>
      </section>
    </div>
  );
};

export default StoresPage;
