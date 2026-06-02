import { useParams, Link, Navigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Clock, BadgeCheck, Navigation, ArrowRight,
  Smartphone, Tablet, Laptop, Gamepad2, ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';
import SEO from '../components/SEO';
import { storeDetailSchema, breadcrumbSchema } from '../lib/structuredData';

const SERVICES = [
  { icon: Smartphone, name: 'Réparation smartphone',  desc: 'Écran, batterie, connecteur — toutes marques' },
  { icon: Tablet,     name: 'Réparation tablette',    desc: 'iPad, Samsung Galaxy Tab, Huawei…' },
  { icon: Laptop,     name: 'Réparation PC / Mac',    desc: 'Écran, clavier, batterie, SSD, dépannage' },
  { icon: Gamepad2,   name: 'Réparation console',     desc: 'PlayStation, Xbox, Nintendo Switch' },
];

const StoreDetailPage = () => {
  const { slug } = useParams();
  const store = STORES.find((s) => s.id === slug);
  if (!store) return <Navigate to="/magasins" replace />;

  const cityShort = store.name.replace('Repair&Co ', '');
  const phoneClean = store.phone.replace(/\s/g, '');

  return (
    <div data-testid={`store-detail-page-${store.id}`}>
      <SEO
        title={`Réparation smartphone, tablette et PC à ${store.city} — Atelier Repair & Co ${cityShort}`}
        description={`Atelier Repair & Co ${cityShort} (${store.address}, ${store.postalCode} ${store.city}) : réparation rapide et garantie de smartphones, tablettes et ordinateurs. Label QualiRépar. Tél : ${store.phone}.`}
        path={`/magasins/${store.id}`}
        jsonLd={[
          storeDetailSchema(store),
          breadcrumbSchema([
            { name: 'Accueil', path: '/' },
            { name: 'Nos magasins', path: '/magasins' },
            { name: cityShort, path: `/magasins/${store.id}` },
          ]),
        ]}
      />

      {/* Hero */}
      <section className="py-12 lg:py-16 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-[#1A5C3A]/70 mb-4" aria-label="breadcrumb">
            <Link to="/" className="hover:underline">Accueil</Link>
            <ChevronRight size={14} className="inline mx-1" />
            <Link to="/magasins" className="hover:underline">Nos magasins</Link>
            <ChevronRight size={14} className="inline mx-1" />
            <span className="text-[#1A5C3A] font-medium">{cityShort}</span>
          </nav>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block text-xs font-medium text-[#1A5C3A]/60 bg-[#E8F5EE] px-2 py-1 rounded">
                  {store.type}
                </span>
                {store.qualirepar && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#1A5C3A] text-white rounded-full text-xs font-medium">
                    <BadgeCheck size={14} /> QualiRépar
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1A1A2E]">
                Réparation à <span className="text-[#1A5C3A]">{store.city}</span>
              </h1>
              <p className="mt-3 text-xl text-[#1A1A2E]/80">
                Atelier Repair & Co {cityShort}
              </p>
              <p className="mt-4 text-base text-[#1A1A2E]/70 leading-relaxed max-w-2xl">
                Bienvenue dans votre atelier Repair & Co à {store.city}. Nos techniciens
                certifiés réparent vos smartphones, tablettes, ordinateurs et consoles
                toutes marques. Diagnostic gratuit, devis transparent et réparation garantie.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/rendez-vous">
                  <Button className="bg-[#1A5C3A] text-white hover:bg-[#1A5C3A]/90 rounded-full" data-testid={`store-detail-rdv-${store.id}`}>
                    Prendre RDV <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
                <a href={`tel:${phoneClean}`}>
                  <Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full" data-testid={`store-detail-call-${store.id}`}>
                    <Phone size={16} className="mr-2" /> Appeler {store.phone}
                  </Button>
                </a>
                <Link to="/devis">
                  <Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full">
                    Devis gratuit
                  </Button>
                </Link>
              </div>
            </div>

            {/* Info card */}
            <Card className="border border-[#E8F5EE] sticky lg:top-24">
              <CardContent className="p-5 space-y-3">
                <h2 className="text-lg font-bold text-[#1A1A2E]">Informations pratiques</h2>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin size={16} className="text-[#1A5C3A] mt-1 flex-shrink-0" />
                  <div>
                    {store.location && <div className="font-medium">{store.location}</div>}
                    <div className="text-[#1A1A2E]/70">{store.address}</div>
                    <div className="text-[#1A1A2E]/70">{store.postalCode} {store.city}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className="text-[#1A5C3A] flex-shrink-0" />
                  <span className="text-[#1A1A2E]/70">{store.hours}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-[#1A5C3A] flex-shrink-0" />
                  <a href={`tel:${phoneClean}`} className="text-[#1A5C3A] font-medium hover:underline">{store.phone}</a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-[#1A5C3A] flex-shrink-0" />
                  <a href={`mailto:${store.email}`} className="text-[#1A5C3A] hover:underline break-all">{store.email}</a>
                </div>
                {store.mapsUrl && (
                  <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer" className="block pt-2">
                    <Button variant="outline" className="w-full border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full" data-testid={`store-detail-maps-${store.id}`}>
                      <Navigation size={14} className="mr-2" /> Voir sur Google Maps
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services proposés */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Services de réparation à <span className="text-[#1A5C3A]">{store.city}</span>
          </h2>
          <p className="mt-2 text-[#1A1A2E]/70">
            Tous les services Repair & Co disponibles dans notre atelier de {cityShort}.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {SERVICES.map((sv) => (
              <Card key={sv.name} className="border border-[#E8F5EE] hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="w-10 h-10 bg-[#E8F5EE] rounded-lg flex items-center justify-center mb-3">
                    <sv.icon className="text-[#1A5C3A]" size={20} />
                  </div>
                  <h3 className="font-semibold text-[#1A1A2E]">{sv.name}</h3>
                  <p className="text-sm text-[#1A1A2E]/70 mt-1">{sv.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* QualiRépar + CTA */}
      <section className="py-12 lg:py-16 bg-[#E8F5EE]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E]">
            Bénéficiez de <span className="text-[#1A5C3A]">15 à 60€ d'aide</span> avec QualiRépar
          </h2>
          <p className="mt-3 text-[#1A1A2E]/70 max-w-2xl mx-auto">
            Notre atelier de {cityShort} est labellisé QualiRépar.
            La réduction est appliquée automatiquement sur votre facture.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link to="/rendez-vous">
              <Button className="bg-[#1A5C3A] text-white hover:bg-[#1A5C3A]/90 rounded-full">
                Prendre RDV à {cityShort} <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
            <Link to="/magasins">
              <Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-white rounded-full">
                Voir tous nos magasins
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoreDetailPage;
