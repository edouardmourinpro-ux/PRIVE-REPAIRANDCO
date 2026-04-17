import { Link } from 'react-router-dom';
import { 
  Smartphone, Laptop, Coffee, Bike, Clock, ChevronRight, 
  BadgeCheck, CheckCircle, ArrowRight, Gamepad2, Info
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const ServicesPage = () => {
  const universes = [
    {
      id: 'smart-connect',
      title: 'SMART & CONNECT',
      subtitle: 'Smartphones, Tablettes, Consoles & Informatique',
      icon: Smartphone,
      color: 'bg-[#005157]',
      colorLight: 'bg-[#e8f5f5]',
      textColor: 'text-[#005157]',
      services: [
        {
          name: 'Smartphones & Tablettes',
          icon: Smartphone,
          repairs: ['Écran cassé / remplacement de vitre', 'Batterie (autonomie dégradée)', 'Connecteur de charge', 'Caméra avant / arrière', 'Boutons volume / power', 'Haut-parleur / micro'],
          brands: 'Apple, Samsung, Xiaomi, Huawei, OnePlus, Google, Oppo...',
          delay: '30 min à 1h',
          priceFrom: 29
        },
        {
          name: 'Consoles de jeux',
          icon: Gamepad2,
          repairs: ['Manettes (drift, boutons)', 'Lecteur disque', 'Ports HDMI', 'Ventilateur / surchauffe', 'Disque dur / SSD'],
          brands: 'PlayStation, Xbox, Nintendo Switch...',
          delay: '1h à 48h',
          priceFrom: 39
        },
        {
          name: 'Informatique',
          icon: Laptop,
          repairs: ['Remplacement écran', 'Clavier', 'Batterie', 'Nettoyage / optimisation', 'Remplacement disque dur / SSD', 'Réinstallation système'],
          brands: 'HP, Dell, Lenovo, Asus, Acer, Apple MacBook, MSI...',
          delay: '24h à 48h',
          priceFrom: 49
        }
      ]
    },
    {
      id: 'home',
      title: 'HOME',
      subtitle: 'Petit Électroménager',
      icon: Coffee,
      color: 'bg-[#005157]',
      colorLight: 'bg-[#e8f5f5]',
      textColor: 'text-[#005157]',
      services: [
        {
          name: 'Petit électroménager',
          icon: Coffee,
          repairs: ['Cafetières & machines à café', 'Aspirateurs', 'Grille-pain & bouilloires', 'Mixeurs & robots', 'Fers à repasser', 'Diagnostic + réparation sur place'],
          brands: 'Philips, Bosch, Moulinex, SEB, Dyson, Nespresso, De\'Longhi...',
          delay: 'Selon pièces disponibles',
          priceFrom: null
        }
      ]
    },
    {
      id: 'mobility',
      title: 'MOBILITY',
      subtitle: 'Vélos électriques (VAE) et Trottinettes',
      icon: Bike,
      color: 'bg-[#86cbd4]',
      colorLight: 'bg-[#e8f5f5]',
      textColor: 'text-[#005157]',
      notice: 'Service disponible uniquement dans les magasins de Montpellier Est et Béziers',
      services: [
        {
          name: 'Vélos électriques & Trottinettes',
          icon: Bike,
          repairs: ['Batterie (diagnostic & remplacement)', 'Moteur', 'Contrôleur', 'Freins', 'Pneus & chambres à air', 'Écran / tableau de bord'],
          brands: 'Toutes marques de VAE et trottinettes électriques',
          delay: '24h à 72h',
          priceFrom: 35
        }
      ]
    }
  ];

  const scrollToUniverse = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div data-testid="services-page">
      {/* Hero */}
      <section className="py-10 lg:py-14 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#005157] tracking-tight">
            Nos services de réparation
          </h1>
          <p className="mt-4 text-lg text-[#1A1A2E]/80 max-w-2xl leading-relaxed">
            Repair & Co répare tous vos appareils électroniques, toutes marques. 
            Diagnostic gratuit, devis immédiat, réparation garantie.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/devis" data-testid="services-hero-cta-quote">
              <Button className="bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full">
                Obtenir un devis
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link to="/rendez-vous" data-testid="services-hero-cta-appointment">
              <Button variant="outline" className="border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full">
                Prendre un rendez-vous
              </Button>
            </Link>
          </div>
          
          {/* Universe Quick Links */}
          <div className="mt-8 flex flex-wrap gap-3">
            {universes.map((universe) => (
              <button
                key={universe.id}
                onClick={() => scrollToUniverse(universe.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8f5f5] text-[#005157] font-medium text-sm hover:bg-[#86cbd4]/30 transition-colors"
              >
                <universe.icon size={18} />
                {universe.title}
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services by Universe */}
      <section className="py-10 lg:py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {universes.map((universe) => (
            <div key={universe.id} id={universe.id} data-testid={`universe-${universe.id}`} className="scroll-mt-24">
              {/* Universe Header */}
              <div className={`${universe.colorLight} rounded-2xl p-5 mb-6`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${universe.color} rounded-xl flex items-center justify-center`}>
                      <universe.icon className="text-white" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#005157]">{universe.title}</h2>
                      <p className="text-[#1A1A2E]/70 text-sm">{universe.subtitle}</p>
                    </div>
                  </div>
                </div>
                {universe.notice && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-[#1A1A2E]/70 bg-white/50 rounded-lg px-3 py-2">
                    <Info size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{universe.notice}</span>
                  </div>
                )}
              </div>

              {/* Services Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {universe.services.map((service, idx) => (
                  <Card key={idx} className="border border-[#e8f5f5] hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-[#e8f5f5] rounded-lg flex items-center justify-center">
                          <service.icon className="text-[#005157]" size={20} />
                        </div>
                        <h3 className="font-semibold text-[#005157]">{service.name}</h3>
                      </div>
                      
                      <p className="text-xs text-[#1A1A2E]/60 mb-3">{service.brands}</p>
                      
                      <ul className="space-y-1 mb-4">
                        {service.repairs.slice(0, 4).map((repair, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="text-[#86cbd4] flex-shrink-0 mt-0.5" size={14} />
                            <span className="text-[#1A1A2E]/80">{repair}</span>
                          </li>
                        ))}
                        {service.repairs.length > 4 && (
                          <li className="text-sm text-[#1A1A2E]/60 pl-5">
                            + {service.repairs.length - 4} autres réparations
                          </li>
                        )}
                      </ul>

                      <div className="flex items-center justify-between text-xs border-t border-[#e8f5f5] pt-3 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-[#86cbd4]" />
                          <span className="text-[#1A1A2E]/70">{service.delay}</span>
                        </div>
                        {service.priceFrom ? (
                          <span className="font-semibold text-[#005157]">
                            À partir de {service.priceFrom}€
                          </span>
                        ) : (
                          <span className="font-semibold text-[#005157]">
                            Sur devis
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Link to="/devis" className="flex-1">
                          <Button size="sm" className="w-full bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full text-xs">
                            Obtenir un devis
                          </Button>
                        </Link>
                        <Link to="/rendez-vous" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full text-xs">
                            Prendre RDV
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          <p className="text-sm text-[#1A1A2E]/60 text-center">
            *Sous réserve de la disponibilité de la pièce détachée.
          </p>
        </div>
      </section>

      {/* QualiRépar Section */}
      <section id="qualirepar" className="py-10 lg:py-14 section-mint scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg">
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#e8f5f5] rounded-full text-[#005157] text-sm font-medium mb-3">
                  <BadgeCheck className="text-[#86cbd4]" size={16} />
                  Label QualiRépar
                </div>
                <h2 className="text-2xl font-bold text-[#005157] mb-3">
                  De 15€ à 80€ de réduction selon l'appareil
                </h2>
                <p className="text-[#1A1A2E]/80 leading-relaxed text-sm">
                  Tous nos magasins sont labellisés QualiRépar. Bénéficiez d'une aide financière 
                  directement déduite de votre facture. Les prix affichés sont <strong>cumulables 
                  avec le Bonus QualiRépar</strong>.
                </p>
                <a 
                  href="https://www.label-qualirepar.fr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-3 text-[#005157] font-medium hover:text-[#86cbd4] text-sm"
                >
                  En savoir plus sur QualiRépar
                  <ChevronRight size={16} className="ml-1" />
                </a>
              </div>
              <div className="flex justify-center">
                <a 
                  href="https://www.label-qualirepar.fr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <img
                    src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                    alt="Label QualiRépar"
                    className="max-w-[200px] hover:opacity-80 transition-opacity"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10 lg:py-14 bg-[#005157]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            Besoin d'une réparation ?
          </h2>
          <p className="text-base text-white/80 mb-6 max-w-xl mx-auto">
            Obtenez un devis gratuit ou venez directement dans l'un de nos magasins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/devis" data-testid="services-cta-quote">
              <Button className="bg-white text-[#005157] hover:bg-[#e8f5f5] rounded-full px-8 py-5">
                Obtenir un devis
                <ArrowRight className="ml-2" size={18} />
              </Button>
            </Link>
            <Link to="/rendez-vous" data-testid="services-cta-appointment">
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-8 py-5">
                Prendre un rendez-vous
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
