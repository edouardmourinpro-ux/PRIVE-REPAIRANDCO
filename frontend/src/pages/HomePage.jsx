import { Link } from 'react-router-dom';
import { 
  Smartphone, Tablet, Laptop, Coffee, MapPin, Star, Clock, 
  Shield, Zap, MessageSquare, Recycle, ChevronRight, CheckCircle,
  Phone, ArrowRight, BadgeCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { STORES, SERVICES, REVIEWS } from '../data/stores';

const HomePage = () => {
  const iconMap = {
    Smartphone: Smartphone,
    Tablet: Tablet,
    Laptop: Laptop,
    Coffee: Coffee
  };

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="hero-gradient py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A5C3A] leading-tight tracking-tight">
                Votre expert en{' '}
                <span className="text-[#2ECC71]">réparation</span>{' '}
                et reconditionnement
              </h1>
              <p className="mt-4 text-lg text-[#1A1A2E]/80 leading-relaxed max-w-xl">
                <strong>Smartphones & Tablettes / Informatique / Petit Électroménager / Vélos et Trottinettes.</strong>
                <br />
                Pour tous ces univers, les équipes techniques Repair&Co réparent au prix le plus juste.
              </p>
              <p className="mt-3 text-base text-[#1A5C3A] font-medium">
                Retrouvez-nous dans nos ateliers en proximité ou en ligne.
              </p>
              
              {/* QualiRépar Badge */}
              <a href="#qualirepar" className="inline-block mt-4" data-testid="hero-qualirepar-link">
                <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm border border-[#E8F5EE] hover:shadow-md transition-shadow">
                  <img
                    src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                    alt="Label QualiRépar"
                    className="h-10"
                  />
                  <span className="text-sm text-[#1A5C3A] font-medium">Jusqu'à 80€ de bonus</span>
                </div>
              </a>
              
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <Link to="/devis" data-testid="hero-cta-quote">
                  <Button className="w-full sm:w-auto bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-8 py-6 text-lg font-semibold transition-all duration-300 hover:-translate-y-1">
                    Devis gratuit en ligne
                    <ArrowRight className="ml-2" size={20} />
                  </Button>
                </Link>
                <Link to="/rendez-vous" data-testid="hero-cta-appointment">
                  <Button variant="outline" className="w-full sm:w-auto border-2 border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-8 py-6 text-lg font-semibold transition-all duration-300">
                    Prendre rendez-vous
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative animate-fade-in-up animate-delay-200">
              <img
                src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/p6booyft_IMG_9355-scaled%20%281%29.webp"
                alt="Magasin Repair & Co - réparation smartphone Nîmes"
                className="rounded-2xl shadow-xl w-full object-cover"
              />
              {/* Express Badge */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-[#E8F5EE] rounded-full flex items-center justify-center">
                  <Zap className="text-[#2ECC71]" size={24} />
                </div>
                <div>
                  <p className="font-semibold text-[#1A5C3A]">Réparation express</p>
                  <p className="text-sm text-[#1A1A2E]/60">En moins d'1 heure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reassurance Band */}
      <section className="bg-white py-8 border-y border-[#E8F5EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <Zap className="text-[#2ECC71] flex-shrink-0" size={24} />
              <span className="text-[#1A1A2E] font-medium">Réparation rapide</span>
            </div>
            <div className="flex items-center gap-3">
              <MessageSquare className="text-[#2ECC71] flex-shrink-0" size={24} />
              <span className="text-[#1A1A2E] font-medium">Devis instantané</span>
            </div>
            <div className="flex items-center gap-3">
              <Recycle className="text-[#2ECC71] flex-shrink-0" size={24} />
              <span className="text-[#1A1A2E] font-medium">Reconditionnés</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="text-[#2ECC71] flex-shrink-0" size={24} />
              <span className="text-[#1A1A2E] font-medium">5 magasins</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star className="text-[#2ECC71] fill-[#2ECC71]" size={24} />
                <span className="text-3xl font-bold text-[#1A5C3A]">4,7/5</span>
              </div>
              <p className="text-[#1A1A2E]/60 text-sm">225 avis Google</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <MapPin className="text-[#2ECC71]" size={24} />
                <span className="text-3xl font-bold text-[#1A5C3A]">5</span>
              </div>
              <p className="text-[#1A1A2E]/60 text-sm">Magasins en France</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Zap className="text-[#2ECC71]" size={24} />
                <span className="text-3xl font-bold text-[#1A5C3A]">&lt;1h</span>
              </div>
              <p className="text-[#1A1A2E]/60 text-sm">Réparations courantes</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Shield className="text-[#2ECC71]" size={24} />
                <span className="text-3xl font-bold text-[#1A5C3A]">100%</span>
              </div>
              <p className="text-[#1A1A2E]/60 text-sm">Garantie réparations</p>
            </div>
            <div className="text-center col-span-2 lg:col-span-1">
              <div className="flex items-center justify-center gap-1 mb-2">
                <BadgeCheck className="text-[#2ECC71]" size={24} />
                <span className="text-3xl font-bold text-[#1A5C3A]">50€</span>
              </div>
              <p className="text-[#1A1A2E]/60 text-sm">Bonus QualiRépar</p>
            </div>
          </div>
        </div>
      </section>

      {/* QualiRépar Section */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-[#1A5C3A] text-sm font-medium mb-6">
                <BadgeCheck className="text-[#2ECC71]" size={18} />
                Label officiel de l'État
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1A5C3A] tracking-tight">
                Économisez jusqu'à 50€ grâce au bonus réparation
              </h2>
              <p className="mt-6 text-lg text-[#1A1A2E]/80 leading-relaxed">
                Repair & Co est labellisé <strong>QualiRépar</strong>. Ce label officiel vous permet 
                de bénéficier d'une aide de l'État directement déduite de votre facture — 
                jusqu'à 50€ selon l'appareil. Réparer plutôt que remplacer, c'est bon pour 
                votre portefeuille et pour la planète.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/faq" data-testid="qualirepar-learn-more">
                  <Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-6 py-3">
                    En savoir plus
                    <ChevronRight className="ml-1" size={18} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm">
                <img
                  src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                  alt="Label QualiRépar - Réparation certifiée"
                  className="w-full"
                />
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A1A2E]">Jusqu'à 50€ d'aide directe</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A1A2E]">Déduit automatiquement de la facture</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={20} />
                    <span className="text-[#1A1A2E]">Tous nos magasins labellisés</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A5C3A] tracking-tight">
              Nos services de réparation
            </h2>
            <p className="mt-4 text-lg text-[#1A1A2E]/70 max-w-2xl">
              Diagnostic gratuit, devis immédiat, réparation garantie. Toutes marques, tous appareils.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((service) => {
              const IconComponent = iconMap[service.icon];
              return (
                <Card 
                  key={service.id} 
                  className="service-card group cursor-pointer"
                  data-testid={`service-card-${service.id}`}
                >
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-[#E8F5EE] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#2ECC71]/20 transition-colors duration-300">
                      <IconComponent className="text-[#2ECC71]" size={28} />
                    </div>
                    <h3 className="text-xl font-semibold text-[#1A5C3A] mb-2">{service.title}</h3>
                    <p className="text-[#1A1A2E]/70 text-sm leading-relaxed mb-4">
                      {service.description}
                    </p>
                    {service.priceFrom && (
                      <p className="text-[#2ECC71] font-semibold text-sm mb-4">
                        À partir de {service.priceFrom}€
                      </p>
                    )}
                    <Link 
                      to="/services" 
                      className="inline-flex items-center text-[#1A5C3A] font-medium text-sm hover:text-[#2ECC71] transition-colors"
                    >
                      Voir les réparations
                      <ChevronRight size={16} className="ml-1" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-10 text-center">
            <Link to="/services" data-testid="services-view-all">
              <Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-8">
                Voir tous nos services
                <ChevronRight size={18} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stores Section */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A5C3A] tracking-tight">
              Près de chez vous, dans votre centre commercial
            </h2>
            <p className="mt-4 text-lg text-[#1A1A2E]/70 max-w-2xl">
              5 magasins dans le Sud de la France pour vous servir.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STORES.slice(0, 5).map((store) => (
              <Card 
                key={store.id} 
                className="store-card"
                data-testid={`store-card-${store.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-[#1A5C3A]">{store.name}</h3>
                      <p className="text-[#1A1A2E]/60 text-sm">{store.location}</p>
                    </div>
                    {store.rating && (
                      <div className="flex items-center gap-1 bg-[#E8F5EE] px-2 py-1 rounded-full">
                        <Star className="text-[#2ECC71] fill-[#2ECC71]" size={14} />
                        <span className="text-sm font-medium text-[#1A5C3A]">{store.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-[#1A1A2E]/70 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-[#2ECC71] mt-0.5 flex-shrink-0" />
                      <span>{store.address}, {store.postalCode} {store.city}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-[#2ECC71] flex-shrink-0" />
                      <span>{store.hours}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-[#2ECC71] flex-shrink-0" />
                      <a href={`tel:${store.phone.replace(/\s/g, '')}`} className="hover:text-[#1A5C3A]">
                        {store.phone}
                      </a>
                    </div>
                  </div>

                  {store.qualirepar && (
                    <div className="qualirepar-badge mb-4">
                      <BadgeCheck size={16} />
                      <span>QualiRépar</span>
                    </div>
                  )}
                  
                  <Link 
                    to="/magasins" 
                    className="inline-flex items-center text-[#1A5C3A] font-medium text-sm hover:text-[#2ECC71] transition-colors"
                  >
                    Voir le magasin
                    <ChevronRight size={16} className="ml-1" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-10 text-center">
            <Link to="/magasins" data-testid="stores-view-all">
              <Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-8">
                Voir tous nos magasins
                <ChevronRight size={18} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-left mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-[#1A5C3A] tracking-tight">
              Ce que disent nos clients
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`${star <= 4 ? 'text-[#2ECC71] fill-[#2ECC71]' : 'text-[#2ECC71]'}`} 
                    size={20} 
                  />
                ))}
              </div>
              <span className="text-[#1A1A2E]/70">4,7/5 · +500 avis cumulés</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {REVIEWS.map((review) => (
              <Card key={review.id} className="card-repair" data-testid={`review-${review.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`${star <= review.rating ? 'text-[#2ECC71] fill-[#2ECC71]' : 'text-[#E8F5EE]'}`} 
                        size={18} 
                      />
                    ))}
                  </div>
                  <p className="text-[#1A1A2E] leading-relaxed mb-4">"{review.text}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[#1A5C3A]">{review.name}</p>
                      <p className="text-sm text-[#1A1A2E]/60">{review.store}</p>
                    </div>
                    <p className="text-xs text-[#1A1A2E]/50">{review.date}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Buyback Teaser */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-[#1A5C3A] tracking-tight">
                Votre ancien appareil a de la valeur
              </h2>
              <p className="mt-6 text-lg text-[#1A1A2E]/80 leading-relaxed">
                Repair & Co rachète et reconditionne vos smartphones. 
                Obtenez une estimation en ligne en 2 minutes.
              </p>
              <div className="mt-8">
                <Link to="/rachat" data-testid="buyback-cta">
                  <Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-8">
                    Estimer mon appareil
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <Recycle className="text-[#2ECC71] mx-auto mb-4" size={64} />
                <h3 className="text-xl font-semibold text-[#1A5C3A] text-center mb-2">
                  Recyclage & Reconditionnement
                </h3>
                <p className="text-[#1A1A2E]/70 text-center text-sm">
                  Donnez une seconde vie à vos appareils et participez à l'économie circulaire.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Teaser */}
      <section className="py-16 lg:py-24 bg-[#1A5C3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Vous gérez une flotte d'appareils en entreprise ?
              </h2>
              <p className="mt-6 text-lg text-white/80 leading-relaxed">
                Réparation en volume, devis groupé, facturation entreprise. 
                On a une offre dédiée pour les professionnels.
              </p>
              <div className="mt-8">
                <Link to="/entreprises" data-testid="b2b-cta">
                  <Button className="bg-white text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-8">
                    Découvrir l'offre entreprise
                    <ArrowRight className="ml-2" size={18} />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src="https://images.pexels.com/photos/7988665/pexels-photo-7988665.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Offre entreprise - réparation flotte mobile"
                className="rounded-2xl shadow-xl max-w-md w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
