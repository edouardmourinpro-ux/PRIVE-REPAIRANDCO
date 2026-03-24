import { Link } from 'react-router-dom';
import { 
  Heart, Shield, Leaf, MapPin, Users, Award, BadgeCheck
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const AboutPage = () => {
  const values = [
    {
      icon: Heart,
      title: 'Proximité',
      description: 'Nous sommes là où vous êtes, dans votre centre commercial, pour un service rapide et accessible.'
    },
    {
      icon: Shield,
      title: 'Expertise',
      description: 'Nos techniciens sont formés et certifiés. Chaque réparation est garantie.'
    },
    {
      icon: Leaf,
      title: 'Éco-responsabilité',
      description: 'Réparer plutôt que remplacer : nous participons à réduire les déchets électroniques.'
    },
  ];

  return (
    <div data-testid="about-page">
      {/* Hero */}
      <section className="py-16 lg:py-24 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A5C3A] tracking-tight">
                Qui sommes-nous
              </h1>
              <p className="mt-6 text-lg text-[#1A1A2E]/80 leading-relaxed">
                Repair & Co est une enseigne de réparation d'appareils électroniques 
                implantée en stands de proximité dans les centres commerciaux du Sud de la France.
              </p>
              <p className="mt-4 text-lg text-[#1A1A2E]/80 leading-relaxed">
                Notre mission : rendre la réparation accessible à tous, rapide et de qualité, 
                tout en contribuant à un monde plus durable.
              </p>
            </div>
            <div className="flex justify-center">
              <img
                src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/p6booyft_IMG_9355-scaled%20%281%29.webp"
                alt="Magasin Repair & Co"
                className="rounded-2xl shadow-xl max-w-md w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A5C3A] mb-12 text-center">
            Nos valeurs
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="card-repair text-center">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-[#E8F5EE] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <value.icon className="text-[#2ECC71]" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1A5C3A] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[#1A1A2E]/70 leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* QualiRépar */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-[#1A5C3A] text-sm font-medium mb-6">
                <BadgeCheck className="text-[#2ECC71]" size={18} />
                Engagement qualité
              </div>
              <h2 className="text-3xl font-bold text-[#1A5C3A] mb-6">
                Label QualiRépar
              </h2>
              <p className="text-[#1A1A2E]/80 leading-relaxed mb-4">
                Tous nos magasins sont labellisés <strong>QualiRépar</strong>, le label officiel 
                de l'État français pour les réparateurs de qualité.
              </p>
              <p className="text-[#1A1A2E]/80 leading-relaxed mb-4">
                Ce label garantit :
              </p>
              <ul className="space-y-2 text-[#1A1A2E]/80">
                <li className="flex items-start gap-2">
                  <span className="text-[#2ECC71]">✓</span>
                  Des techniciens qualifiés et formés
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2ECC71]">✓</span>
                  Des pièces de qualité
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2ECC71]">✓</span>
                  Une garantie sur les réparations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2ECC71]">✓</span>
                  Jusqu'à 50€ d'aide directe déduite de votre facture
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <img
                  src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                  alt="Label QualiRépar"
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team placeholder */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-[#1A5C3A] mb-6">
            Notre équipe
          </h2>
          <p className="text-lg text-[#1A1A2E]/70 mb-12 max-w-2xl mx-auto">
            Une équipe de techniciens passionnés, formés et certifiés, 
            à votre service dans nos 5 magasins.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="w-32 h-32 bg-[#E8F5EE] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="text-[#2ECC71]" size={48} />
                </div>
                <p className="font-semibold text-[#1A5C3A]">Technicien {i}</p>
                <p className="text-sm text-[#1A1A2E]/60">Expert réparation</p>
              </div>
            ))}
          </div>
          
          <p className="mt-8 text-[#1A1A2E]/60 text-sm">
            Photos de l'équipe à venir
          </p>
        </div>
      </section>

      {/* Locations */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[#1A5C3A] mb-12 text-center">
            Nos implantations
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {STORES.map((store) => (
              <Card key={store.id} className="card-repair">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="text-[#2ECC71]" size={20} />
                    <h3 className="font-semibold text-[#1A5C3A]">{store.name}</h3>
                  </div>
                  <p className="text-sm text-[#1A1A2E]/70">{store.location}</p>
                  <p className="text-sm text-[#1A1A2E]/70">{store.city}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/magasins" data-testid="about-stores-link">
              <Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full px-8">
                Voir tous nos magasins
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Press */}
      <section className="py-16 lg:py-24 bg-[#1A5C3A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Award className="text-[#2ECC71] mx-auto mb-6" size={48} />
          <h2 className="text-3xl font-bold text-white mb-6">
            Presse & Partenariats
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Vous êtes journaliste ou souhaitez établir un partenariat avec Repair & Co ?
          </p>
          <Link to="/contact" data-testid="about-contact-link">
            <Button className="bg-white text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full px-8">
              Contactez-nous
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
