import { Link } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, Star, ExternalLink, Navigation, BadgeCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const StoresPage = () => {
  return (
    <div data-testid="stores-page">
      {/* Hero */}
      <section className="py-16 lg:py-20 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A5C3A] tracking-tight">
            Nos magasins — Près de chez vous
          </h1>
          <p className="mt-6 text-lg text-[#1A1A2E]/80 max-w-2xl leading-relaxed">
            Retrouvez Repair & Co dans votre centre commercial. Pas besoin de chercher loin — 
            on est dans votre Carrefour ou votre galerie.
          </p>
        </div>
      </section>

      {/* Stores List */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {STORES.map((store) => (
              <Card 
                key={store.id} 
                className="overflow-hidden border border-[#E8F5EE] hover:shadow-lg transition-shadow duration-300"
                data-testid={`store-detail-${store.id}`}
              >
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-2">
                    {/* Store Info */}
                    <div className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-[#1A5C3A]">{store.name}</h2>
                          <p className="text-[#1A1A2E]/60 mt-1">{store.location}</p>
                        </div>
                        {store.rating && (
                          <div className="flex items-center gap-1 bg-[#E8F5EE] px-3 py-1.5 rounded-full">
                            <Star className="text-[#2ECC71] fill-[#2ECC71]" size={16} />
                            <span className="font-semibold text-[#1A5C3A]">{store.rating}</span>
                            {store.reviewsCount && (
                              <span className="text-[#1A1A2E]/60 text-sm ml-1">
                                · {store.reviewsCount} avis
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                          <MapPin className="text-[#2ECC71] flex-shrink-0 mt-1" size={20} />
                          <div>
                            <p className="text-[#1A1A2E] font-medium">{store.address}</p>
                            <p className="text-[#1A1A2E]/60">{store.postalCode} {store.city}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Phone className="text-[#2ECC71] flex-shrink-0" size={20} />
                          <a 
                            href={`tel:${store.phone.replace(/\s/g, '')}`}
                            className="text-[#1A1A2E] hover:text-[#1A5C3A] font-medium"
                          >
                            {store.phone}
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Clock className="text-[#2ECC71] flex-shrink-0" size={20} />
                          <span className="text-[#1A1A2E]">{store.hours}</span>
                        </div>
                      </div>

                      {store.qualirepar && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F5EE] rounded-full text-[#1A5C3A] text-sm font-medium mb-6">
                          <BadgeCheck className="text-[#2ECC71]" size={18} />
                          Label QualiRépar
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Link to="/rendez-vous">
                          <Button 
                            className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full"
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
                            variant="outline" 
                            className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full"
                            data-testid={`store-directions-${store.id}`}
                          >
                            <Navigation size={18} className="mr-2" />
                            Itinéraire
                          </Button>
                        </a>
                      </div>
                    </div>

                    {/* Map */}
                    <div className="bg-[#E8F5EE] min-h-[300px] lg:min-h-full relative">
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(store.address + ', ' + store.postalCode + ' ' + store.city)}&zoom=15`}
                        width="100%"
                        height="100%"
                        style={{ border: 0, minHeight: '300px' }}
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
                        className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm font-medium text-[#1A5C3A] hover:bg-[#E8F5EE] transition-colors"
                      >
                        <ExternalLink size={16} />
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

      {/* CTA */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1A5C3A] mb-6">
            Besoin d'une réparation ?
          </h2>
          <p className="text-lg text-[#1A1A2E]/80 mb-8 max-w-xl mx-auto">
            Obtenez un devis gratuit en ligne ou passez directement nous voir en magasin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/devis" data-testid="stores-cta-quote">
              <Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-8">
                Devis gratuit en ligne
              </Button>
            </Link>
            <Link to="/rendez-vous" data-testid="stores-cta-appointment">
              <Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-white rounded-full px-8">
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
