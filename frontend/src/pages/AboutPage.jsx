import { Link } from 'react-router-dom';
import { 
  Heart, Shield, Leaf, MapPin, Users, Award, BadgeCheck,
  Recycle, Building2, Wrench, HandHeart, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { STORES } from '../data/stores';

const AboutPage = () => {
  const values = [
    {
      icon: Recycle,
      title: 'Réduction des déchets',
      description: 'Nous prolongeons la vie de vos appareils pour limiter les déchets électroniques.'
    },
    {
      icon: HandHeart,
      title: 'Utilité sociale',
      description: 'Rendre la réparation accessible à tous, à des prix justes.'
    },
    {
      icon: MapPin,
      title: 'Ancrage local',
      description: 'Présents dans vos centres commerciaux, au plus près de chez vous.'
    },
  ];

  const teamBlocks = [
    {
      icon: Heart,
      title: 'Une équipe engagée',
      description: 'Des passionnés du numérique qui œuvrent chaque jour pour une consommation plus responsable.'
    },
    {
      icon: Wrench,
      title: 'Des techniciens qualifiés',
      description: 'Formés et certifiés, nos techniciens maîtrisent toutes les marques et tous les types d\'appareils.'
    },
    {
      icon: MapPin,
      title: 'Des équipes proches de chez vous',
      description: 'Dans nos 5 magasins du Sud de la France, une équipe locale vous accueille.'
    },
  ];

  return (
    <div data-testid="about-page">
      {/* Hero */}
      <section className="py-12 lg:py-16 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
                Qui sommes-nous ?
              </h1>
              <p className="mt-5 text-base text-[#111111]/80 leading-relaxed font-semibold">
                REPAIR&CO, une entreprise engagée et éco-responsable
              </p>
              <p className="mt-3 text-base text-[#111111]/80 leading-relaxed">
                Spécialiste de la seconde vie des appareils numériques et des objets connectés 
                (smartphones, informatique, petit électroménager…), et des solutions de mobilité douce 
                (vélos et trottinettes électriques), REPAIR&CO place la durabilité au cœur de son expertise.
              </p>
              <p className="mt-3 text-base text-[#111111]/80 leading-relaxed">
                Grâce à une large gamme de services de réparation et d'intervention, nos équipes 
                accompagnent au quotidien les particuliers, les entreprises et les acteurs de l'Économie 
                Sociale et Solidaire, en les aidant à faire le choix du "réparer plutôt que jeter".
              </p>
              <p className="mt-3 text-base text-[#111111]/80 leading-relaxed">
                Depuis plus de <strong>10 ans</strong>, nous œuvrons auprès de particuliers et des entreprises 
                pour une consommation plus responsable, durable et respectueuse de l'environnement.
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

      {/* Mission Statement */}
      <section className="py-10 lg:py-12 bg-[#005157]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xl lg:text-2xl text-white font-medium italic leading-relaxed">
            "Développer des services de réparation et de reconditionnement en proximité pour 
            les particuliers et les entreprises, et faciliter grâce à nos experts la seconde vie 
            des objets électroniques du quotidien."
          </p>
          <p className="mt-4 text-white/60 text-sm">— Notre raison d'être</p>
        </div>
      </section>

      {/* ESS Section */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#e8f5f5] rounded-full text-[#005157] text-sm font-medium mb-4">
                <Leaf className="text-[#005157]" size={16} />
                Économie Sociale et Solidaire
              </div>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Repair&Co au service de <span className="text-[#005157]">l'ESS</span>
              </h2>
              <p className="text-[#111111]/80 leading-relaxed mb-4">
                Notre engagement va au-delà de la simple réparation. Nous participons activement 
                à l'économie circulaire et à la transition écologique.
              </p>
              <p className="text-[#111111]/80 leading-relaxed">
                Nous accompagnons également les <strong>entreprises et collectivités</strong> dans 
                leur démarche RSE, en proposant des solutions de réparation et de reconditionnement 
                adaptées à leurs besoins.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {values.map((value, index) => (
                <Card key={index} className="border border-[#e8f5f5]">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#e8f5f5] rounded-lg flex items-center justify-center flex-shrink-0">
                      <value.icon className="text-[#005157]" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111111] text-sm">{value.title}</h3>
                      <p className="text-[#111111]/70 text-sm mt-1">{value.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* QualiRépar */}
      <section className="py-12 lg:py-16 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="flex justify-center order-2 lg:order-1">
              <a 
                href="https://www.label-qualirepar.fr/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <img
                    src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                    alt="Label QualiRépar"
                    className="max-w-[180px] mx-auto"
                  />
                </div>
              </a>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[#005157] text-sm font-medium mb-4">
                <BadgeCheck className="text-[#005157]" size={16} />
                Engagement qualité
              </div>
              <h2 className="text-2xl font-bold text-[#111111] mb-4">
                Label <span className="text-[#005157]">QualiRépar</span>
              </h2>
              <p className="text-[#111111]/80 leading-relaxed mb-3">
                Tous nos magasins sont labellisés <strong>QualiRépar</strong>, le label officiel 
                de l'État français pour les réparateurs de qualité.
              </p>
              <ul className="space-y-2 text-[#111111]/80 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-[#005157] flex-shrink-0 mt-0.5" size={16} />
                  Des techniciens qualifiés et formés
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-[#005157] flex-shrink-0 mt-0.5" size={16} />
                  Des pièces de qualité
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-[#005157] flex-shrink-0 mt-0.5" size={16} />
                  Une garantie sur les réparations
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-[#005157] flex-shrink-0 mt-0.5" size={16} />
                  De 15€ à 80€ d'aide directe selon l'appareil
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#111111] mb-4">
              L'équipe <span className="text-[#005157]">Repair&Co</span>
            </h2>
            <p className="text-base text-[#111111]/70 max-w-2xl mx-auto">
              Chez Repair&Co, notre force, c'est notre équipe. Des techniciens expérimentés, 
              des conseillers à l'écoute, et des passionnés du numérique qui œuvrent chaque jour 
              pour donner une seconde vie à vos appareils.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {teamBlocks.map((block, index) => (
              <Card key={index} className="card-repair text-center">
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-[#e8f5f5] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <block.icon className="text-[#005157]" size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-[#111111] mb-2">
                    {block.title}
                  </h3>
                  <p className="text-[#111111]/70 text-sm leading-relaxed">
                    {block.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="py-12 lg:py-16 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[#111111] mb-8 text-center">
            Nos implantations
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {STORES.map((store) => (
              <Card key={store.id} className="bg-white">
                <CardContent className="p-4 text-center">
                  <MapPin className="text-[#005157] mx-auto mb-2" size={20} />
                  <h3 className="font-semibold text-[#111111] text-sm">{store.name}</h3>
                  <p className="text-xs text-[#111111]/60">{store.city}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/magasins" data-testid="about-stores-link">
              <Button className="bg-[#005157] text-white hover:bg-[#86cbd4] hover:text-[#005157] rounded-full px-6">
                Voir tous nos magasins
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Press */}
      <section className="py-12 lg:py-16 bg-[#005157]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Award className="text-[#86cbd4] mx-auto mb-4" size={40} />
          <h2 className="text-2xl font-bold text-white mb-4">
            Presse & Partenariats
          </h2>
          <p className="text-base text-white/80 mb-6 max-w-xl mx-auto">
            Vous êtes journaliste ou souhaitez établir un partenariat avec Repair & Co ?
          </p>
          <Link to="/contact" data-testid="about-contact-link">
            <Button className="bg-white text-[#005157] hover:bg-[#e8f5f5] rounded-full px-6">
              Contactez-nous
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
