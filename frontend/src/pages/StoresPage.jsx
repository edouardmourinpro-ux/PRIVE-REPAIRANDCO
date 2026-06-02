import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, ExternalLink, Navigation, BadgeCheck,
  Search, Truck, ArrowRight, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';
import SEO from '../components/SEO';
import { allStoresSchema, breadcrumbSchema } from '../lib/structuredData';

const StoresPage = () => {
  const [postalCode, setPostalCode] = useState('');
  const handleSearch = (e) => { e.preventDefault(); alert(`Recherche du magasin le plus proche du code postal ${postalCode}`); };

  return (
    <div data-testid="stores-page">
      <SEO
        title="Nos magasins de réparation — 9 ateliers en Occitanie (Nîmes, Montpellier, Béziers, Lattes…)"
        description="Trouvez votre atelier Repair & Co le plus proche : 9 magasins labellisés QualiRépar à Lattes, Montpellier, Nîmes, Béziers, Pérols… Diagnostic gratuit et réparation sur place."
        path="/magasins"
        jsonLd={[
          ...allStoresSchema(),
          breadcrumbSchema([
            { name: 'Accueil', path: '/' },
            { name: 'Nos magasins', path: '/magasins' },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="py-10 lg:py-14 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Nos magasins <span className="text-[#2ECC71]">partout en France</span>
          </h1>
          <p className="mt-3 text-lg text-[#1A5C3A]/80 max-w-2xl">
            9 magasins Repair&Co pour vous servir, dans toute la France.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <form onSubmit={handleSearch} className="max-w-md">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[#1A5C3A]/40" size={16} />
                  <Input type="text" placeholder="Votre code postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="!pl-10 form-input" data-testid="postal-code-input" />
                </div>
                <Button type="submit" className="bg-[#1A5C3A] text-white hover:bg-[#1A5C3A]/90 rounded-xl" data-testid="postal-code-search">Trouver</Button>
              </div>
            </form>
            <Link to="/rendez-vous">
              <Button className="bg-[#1A5C3A] text-white hover:bg-[#1A5C3A]/90 rounded-full" data-testid="stores-hero-rdv">Prendre RDV <ArrowRight size={18} className="ml-2" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Options */}
      <section className="py-10 lg:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <Card className="border-2 border-[#1A5C3A]/20">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center mb-4"><MapPin className="text-[#1A5C3A]" size={24} /></div>
                <h2 className="text-xl font-bold mb-3">Faire réparer en <span className="text-[#2ECC71]">atelier</span></h2>
                <p className="text-[#1A5C3A]/70 text-sm leading-relaxed">Retrouvez-nous directement dans nos boutiques ateliers. Nos techniciens vous accueillent, diagnostiquent votre appareil et effectuent la réparation sur place.</p>
              </CardContent>
            </Card>
            <Card className="border border-[#E8F5EE]">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center mb-4"><Truck className="text-[#1A5C3A]" size={24} /></div>
                <h2 className="text-xl font-bold mb-3">Faire réparer en ligne — <span className="text-[#2ECC71]">Clic&Repair</span></h2>
                <p className="text-[#1A5C3A]/70 text-sm leading-relaxed">Pas d'atelier près de chez vous ? Grâce à <strong>Clic&Repair</strong> : devis gratuit en ligne, envoi postal gratuit, retour chez vous.</p>
                <Link to="/devis" className="inline-flex items-center mt-4 text-[#1A5C3A] font-medium hover:underline text-sm">Demander un devis en ligne <ExternalLink size={14} className="ml-1" /></Link>
              </CardContent>
            </Card>
          </div>

          {/* All 9 stores */}
          <h2 className="text-2xl font-bold mb-6">Nos <span className="text-[#2ECC71]">9 ateliers</span></h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STORES.map((store) => (
              <Card key={store.id} id={store.id} className="store-card scroll-mt-24" data-testid={`store-detail-${store.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{store.name.replace('Repair&Co ', '')}</h3>
                      {store.location && <p className="text-[#1A5C3A]/60 text-xs">{store.location}</p>}
                      <span className="inline-block mt-1 text-xs font-medium text-[#1A5C3A]/50 bg-[#E8F5EE] px-2 py-0.5 rounded">{store.type}</span>
                    </div>
                    {store.qualirepar && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F5EE] rounded-full text-[#1A5C3A] text-xs font-medium">
                        <BadgeCheck size={14} /> QualiRépar
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm text-[#1A5C3A]/70 mb-4">
                    <div className="flex items-start gap-2"><MapPin size={14} className="text-[#1A5C3A] mt-0.5 flex-shrink-0" /><span className="text-xs">{store.address}, {store.postalCode} {store.city}</span></div>
                    <div className="flex items-center gap-2"><Clock size={14} className="text-[#1A5C3A] flex-shrink-0" /><span className="text-xs">{store.hours}</span></div>
                    <div className="flex items-center gap-2"><Phone size={14} className="text-[#1A5C3A] flex-shrink-0" /><a href={`tel:${store.phone.replace(/\s/g, '')}`} className="text-xs hover:underline">{store.phone}</a></div>
                    <div className="flex items-center gap-2"><Mail size={14} className="text-[#1A5C3A] flex-shrink-0" /><a href={`mailto:${store.email}`} className="text-xs hover:underline">{store.email}</a></div>
                  </div>
                  <div className="flex gap-2">
                    <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button size="sm" variant="outline" className="w-full border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full text-xs" data-testid={`store-gmb-${store.id}`}>
                        <Navigation size={14} className="mr-1" /> Voir le magasin
                      </Button>
                    </a>
                    <Link to="/rendez-vous" className="flex-1">
                      <Button size="sm" className="w-full bg-[#1A5C3A] text-white hover:bg-[#1A5C3A]/90 rounded-full text-xs" data-testid={`store-appointment-${store.id}`}>Prendre RDV</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* QualiRépar */}
      <section id="qualirepar-section" className="py-10 lg:py-14 bg-[#E8F5EE] scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <a href="https://www.label-qualirepar.fr/" target="_blank" rel="noopener noreferrer" className="inline-block">
            <img src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png" alt="Label QualiRépar" className="h-16 mx-auto mb-4 hover:opacity-80 transition-opacity" />
          </a>
          <h2 className="text-xl font-bold mb-3">Tous nos magasins sont labellisés <span className="text-[#2ECC71]">QualiRépar</span></h2>
          <p className="text-[#1A5C3A]/80 max-w-xl mx-auto text-sm">Bénéficiez d'une aide jusqu'à 60€ selon l'appareil réparé, directement déduite de votre facture.</p>
        </div>
      </section>
    </div>
  );
};

export default StoresPage;
