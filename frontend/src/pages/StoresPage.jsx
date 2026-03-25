import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, Star, ExternalLink, Navigation, BadgeCheck,
  Search, Package, Truck, MessageCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const StoresPage = () => {
  const [postalCode, setPostalCode] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // Placeholder for geolocation search
    alert(`Recherche du magasin le plus proche du code postal ${postalCode}`);
  };

  return (
    <div data-testid="stores-page">
      {/* Hero */}
      <section className="py-10 lg:py-14 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A5C3A] tracking-tight">
            Nos magasins — Près de chez vous
          </h1>
          
          {/* Postal Code Search */}
          <form onSubmit={handleSearch} className="mt-6 max-w-md">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#1A1A2E]/40" size={18} />
                <Input
                  type="text"
                  placeholder="Votre code postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="pl-10 form-input"
                  data-testid="postal-code-input"
                />
              </div>
              <Button 
                type="submit"
                className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-xl"
                data-testid="postal-code-search"
              >
                Trouver
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Two Options */}
      <section className="py-10 lg:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Option 1: In-store */}
            <Card className="border-2 border-[#2ECC71]">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center mb-4">
                  <MapPin className="text-[#2ECC71]" size={24} />
                </div>
                <h2 className="text-xl font-bold text-[#1A5C3A] mb-3">
                  Faire réparer en atelier
                </h2>
                <p className="text-[#1A1A2E]/70 text-sm leading-relaxed">
                  Retrouvez-nous directement dans nos boutiques ateliers. Nos techniciens vous 
                  accueillent, diagnostiquent votre appareil et effectuent la réparation sur place 
                  dans les meilleurs délais.
                </p>
              </CardContent>
            </Card>

            {/* Option 2: Online (Clic&Repair) */}
            <Card className="border border-[#E8F5EE]">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-[#E8F5EE] rounded-xl flex items-center justify-center mb-4">
                  <Truck className="text-[#2ECC71]" size={24} />
                </div>
                <h2 className="text-xl font-bold text-[#1A5C3A] mb-3">
                  Faire réparer en ligne — Clic&Repair
                </h2>
                <p className="text-[#1A1A2E]/70 text-sm leading-relaxed">
                  Pas d'atelier près de chez vous ? Aucun souci ! Grâce à notre service <strong>Clic&Repair</strong> : 
                  obtenez un devis gratuit en ligne, envoyez votre appareil gratuitement par voie postale, 
                  recevez-le réparé chez vous en toute sécurité.
                </p>
                <Link to="/devis" className="inline-flex items-center mt-4 text-[#1A5C3A] font-medium hover:text-[#2ECC71] text-sm">
                  Demander un devis en ligne
                  <ExternalLink size={14} className="ml-1" />
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* QualiRépar Link */}
          <a href="#qualirepar-section" className="inline-flex items-center gap-2 mb-8 text-sm text-[#1A5C3A] hover:text-[#2ECC71]">
            <BadgeCheck size={18} className="text-[#2ECC71]" />
            Tous nos magasins sont labellisés QualiRépar — En savoir plus
          </a>

          {/* Stores List */}
          <h2 className="text-2xl font-bold text-[#1A5C3A] mb-6">Nos ateliers</h2>
          <div className="space-y-6">
            {STORES.map((store) => (
              <Card 
                key={store.id} 
                className="overflow-hidden border border-[#E8F5EE] hover:shadow-lg transition-shadow"
                data-testid={`store-detail-${store.id}`}
              >
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-2">
                    {/* Store Info */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-[#1A5C3A]">{store.name}</h3>
                          <p className="text-[#1A1A2E]/60 text-sm">{store.location}</p>
                        </div>
                        {store.rating && (
                          <div className="flex items-center gap-1 bg-[#E8F5EE] px-2 py-1 rounded-full">
                            <Star className="text-[#2ECC71] fill-[#2ECC71]" size={14} />
                            <span className="font-semibold text-[#1A5C3A] text-sm">{store.rating}</span>
                            {store.reviewsCount && (
                              <span className="text-[#1A1A2E]/60 text-xs">
                                · {store.reviewsCount} avis
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2">
                          <MapPin className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={16} />
                          <div className="text-sm">
                            <p className="text-[#1A1A2E]">{store.address}</p>
                            <p className="text-[#1A1A2E]/60">{store.postalCode} {store.city}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="text-[#2ECC71] flex-shrink-0" size={16} />
                          <a 
                            href={`tel:${store.phone.replace(/\s/g, '')}`}
                            className="text-sm text-[#1A1A2E] hover:text-[#1A5C3A]"
                          >
                            {store.phone}
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="text-[#2ECC71] flex-shrink-0" size={16} />
                          <span className="text-sm text-[#1A1A2E]">{store.hours}</span>
                        </div>
                      </div>

                      {store.qualirepar && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F5EE] rounded-full text-[#1A5C3A] text-xs font-medium mb-4">
                          <BadgeCheck size={14} className="text-[#2ECC71]" />
                          QualiRépar
                        </div>
                      )}

                      {/* Avis du magasin */}
                      {store.testimonial && (
                        <div className="bg-[#E8F5EE]/50 rounded-lg p-3 mb-4">
                          <p className="text-sm text-[#1A1A2E]/80 italic">"{store.testimonial.text}"</p>
                          <p className="text-xs text-[#1A5C3A] mt-1 font-medium">— {store.testimonial.author}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Link to="/rendez-vous">
                          <Button 
                            size="sm"
                            className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full text-sm"
                            data-testid={`store-appointment-${store.id}`}
                          >
                            Prendre RDV
                          </Button>
                        </Link>
                        <a 
                          href={store.mapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Button 
                            size="sm"
                            variant="outline" 
                            className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full text-sm"
                            data-testid={`store-directions-${store.id}`}
                          >
                            <Navigation size={14} className="mr-1" />
                            Itinéraire
                          </Button>
                        </a>
                        {store.whatsapp && (
                          <a 
                            href={`https://wa.me/${store.whatsapp}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 rounded-full text-sm"
                              data-testid={`store-whatsapp-${store.id}`}
                            >
                              <MessageCircle size={14} className="mr-1" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Map */}
                    <div className="bg-[#E8F5EE] min-h-[250px] lg:min-h-full relative">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(store.address + ', ' + store.postalCode + ' ' + store.city)}&zoom=15`}
                        width="100%"
                        height="100%"
                        style={{ border: 0, minHeight: '250px' }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Carte ${store.name}`}
                        className="absolute inset-0"
                      />
                      <a 
                        href={store.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute bottom-3 right-3 bg-white px-2 py-1 rounded-lg shadow-md flex items-center gap-1 text-xs font-medium text-[#1A5C3A] hover:bg-[#E8F5EE] transition-colors"
                      >
                        <ExternalLink size={12} />
                        Google Maps
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* QualiRépar Section */}
      <section id="qualirepar-section" className="py-10 lg:py-14 section-mint">
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
            Tous nos magasins sont labellisés QualiRépar
          </h2>
          <p className="text-[#1A1A2E]/80 max-w-xl mx-auto text-sm">
            Bénéficiez d'une aide de 15€ à 80€ selon l'appareil réparé, 
            directement déduite de votre facture.
          </p>
          <a 
            href="https://www.label-qualirepar.fr/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center mt-4 text-[#1A5C3A] font-medium hover:text-[#2ECC71] text-sm"
          >
            En savoir plus
            <ExternalLink size={14} className="ml-1" />
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 lg:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-[#1A5C3A] mb-4">
            Besoin d'une réparation ?
          </h2>
          <p className="text-base text-[#1A1A2E]/70 mb-6 max-w-xl mx-auto">
            Obtenez un devis gratuit en ligne ou passez directement nous voir en magasin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/devis" data-testid="stores-cta-quote">
              <Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-6">
                Devis gratuit en ligne
              </Button>
            </Link>
            <Link to="/rendez-vous" data-testid="stores-cta-appointment">
              <Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-6">
                Prendre rendez-vous
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StoresPage;
