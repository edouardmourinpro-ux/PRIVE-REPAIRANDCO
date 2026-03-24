import { Link } from 'react-router-dom';
import { 
  Smartphone, Tablet, Laptop, Coffee, Clock, ChevronRight, 
  BadgeCheck, CheckCircle, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { SERVICES } from '../data/stores';

const ServicesPage = () => {
  const iconMap = {
    Smartphone: Smartphone,
    Tablet: Tablet,
    Laptop: Laptop,
    Coffee: Coffee
  };

  return (
    <div data-testid="services-page">
      {/* Hero */}
      <section className="py-16 lg:py-20 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A5C3A] tracking-tight">
            Nos services de réparation
          </h1>
          <p className="mt-6 text-lg text-[#1A1A2E]/80 max-w-2xl leading-relaxed">
            Repair & Co répare tous vos appareils électroniques, toutes marques. 
            Diagnostic gratuit, devis immédiat, réparation garantie.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {SERVICES.map((service, index) => {
            const IconComponent = iconMap[service.icon];
            return (
              <div 
                key={service.id} 
                data-testid={`service-section-${service.id}`}
                className={`grid lg:grid-cols-2 gap-12 items-start ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-[#E8F5EE] rounded-2xl flex items-center justify-center">
                      <IconComponent className="text-[#2ECC71]" size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl lg:text-3xl font-bold text-[#1A5C3A]">{service.title}</h2>
                      <p className="text-[#1A1A2E]/60">{service.brands.join(', ')}</p>
                    </div>
                  </div>
                  
                  <p className="text-lg text-[#1A1A2E]/80 leading-relaxed mb-6">
                    {service.description}
                  </p>

                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2 bg-[#E8F5EE] px-4 py-2 rounded-full">
                      <Clock className="text-[#2ECC71]" size={18} />
                      <span className="text-sm font-medium text-[#1A5C3A]">{service.delay}</span>
                    </div>
                    {service.priceFrom && (
                      <div className="flex items-center gap-2 bg-[#E8F5EE] px-4 py-2 rounded-full">
                        <span className="text-sm font-medium text-[#1A5C3A]">
                          À partir de {service.priceFrom}€
                        </span>
                      </div>
                    )}
                  </div>

                  <Link to="/devis">
                    <Button 
                      className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full"
                      data-testid={`cta-quote-${service.id}`}
                    >
                      Obtenir un devis
                      <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </Link>
                </div>

                <Card className={`card-repair ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <CardContent className="p-8">
                    <h3 className="text-lg font-semibold text-[#1A5C3A] mb-4">
                      Réparations courantes
                    </h3>
                    <ul className="space-y-3">
                      {service.repairs.map((repair, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle className="text-[#2ECC71] flex-shrink-0 mt-0.5" size={18} />
                          <span className="text-[#1A1A2E]/80">{repair}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      {/* QualiRépar Section */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E8F5EE] rounded-full text-[#1A5C3A] text-sm font-medium mb-4">
                  <BadgeCheck className="text-[#2ECC71]" size={18} />
                  Label QualiRépar
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-[#1A5C3A] mb-4">
                  Jusqu'à 50€ d'aide de l'État
                </h2>
                <p className="text-[#1A1A2E]/80 leading-relaxed">
                  Tous nos magasins sont labellisés QualiRépar. Bénéficiez d'une aide financière 
                  directement déduite de votre facture sur la réparation de vos appareils électroniques.
                </p>
                <Link to="/faq" className="inline-flex items-center mt-4 text-[#1A5C3A] font-medium hover:text-[#2ECC71]">
                  En savoir plus sur QualiRépar
                  <ChevronRight size={18} className="ml-1" />
                </Link>
              </div>
              <div className="flex justify-center">
                <img
                  src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                  alt="Label QualiRépar"
                  className="max-w-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-[#1A5C3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            Besoin d'une réparation ?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Obtenez un devis gratuit en 2 minutes ou venez directement dans l'un de nos magasins.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/devis" data-testid="services-cta-quote">
              <Button className="bg-white text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-8 py-6 text-lg">
                Devis gratuit
                <ArrowRight className="ml-2" size={20} />
              </Button>
            </Link>
            <Link to="/magasins" data-testid="services-cta-stores">
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg">
                Trouver un magasin
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
