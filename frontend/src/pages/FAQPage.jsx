import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Link } from 'react-router-dom';
import { BadgeCheck, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { FAQ_DATA } from '../data/stores';

const FAQPage = () => {
  return (
    <div data-testid="faq-page">
      {/* Hero */}
      <section className="py-16 lg:py-20 hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#005157] tracking-tight">
            Questions fréquentes
          </h1>
          <p className="mt-6 text-lg text-[#1A1A2E]/80 max-w-2xl leading-relaxed">
            Trouvez rapidement les réponses à vos questions sur nos services, 
            le label QualiRépar, nos tarifs et nos magasins.
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {FAQ_DATA.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12 last:mb-0">
              <h2 className="text-2xl font-bold text-[#005157] mb-6">
                {category.category}
              </h2>
              <Accordion type="single" collapsible className="space-y-2">
                {category.questions.map((item, itemIndex) => (
                  <AccordionItem 
                    key={itemIndex} 
                    value={`${categoryIndex}-${itemIndex}`}
                    className="border border-[#e8f5f5] rounded-xl px-6 data-[state=open]:bg-[#e8f5f5]"
                    data-testid={`faq-item-${categoryIndex}-${itemIndex}`}
                  >
                    <AccordionTrigger className="text-left text-[#1A1A2E] hover:text-[#005157] hover:no-underline py-5">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-[#1A1A2E]/80 pb-5 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* QualiRépar Highlight */}
      <section className="py-16 lg:py-24 section-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-lg">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8f5f5] rounded-full text-[#005157] text-sm font-medium mb-4">
                  <BadgeCheck className="text-[#86cbd4]" size={18} />
                  Label QualiRépar
                </div>
                <h2 className="text-2xl lg:text-3xl font-bold text-[#005157] mb-4">
                  Économisez entre 15 et 80€ sur vos réparations
                </h2>
                <p className="text-[#1A1A2E]/80 leading-relaxed mb-6">
                  Le bonus réparation est une aide financière de l'État qui vous permet de 
                  réduire le coût de vos réparations. Tous nos magasins Repair & Co sont 
                  labellisés QualiRépar, ce qui vous permet d'en bénéficier directement.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/devis" data-testid="faq-cta-quote">
                    <Button className="bg-[#005157] text-white hover:bg-[#86cbd4] rounded-full">
                      Demander un devis
                      <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </Link>
                  <a 
                    href="https://www.label-qualirepar.fr/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" className="border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full">
                      En savoir plus sur QualiRépar
                    </Button>
                  </a>
                </div>
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
                    className="max-w-xs hover:opacity-80 transition-opacity"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-[#005157] mb-4">
            Vous n'avez pas trouvé votre réponse ?
          </h2>
          <p className="text-lg text-[#1A1A2E]/70 mb-8">
            Contactez-nous directement, notre équipe est là pour vous aider.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" data-testid="faq-contact-link">
              <Button className="bg-[#005157] text-white hover:bg-[#86cbd4] rounded-full px-8">
                Nous contacter
              </Button>
            </Link>
            <Link to="/magasins" data-testid="faq-stores-link">
              <Button variant="outline" className="border-[#005157] text-[#005157] hover:bg-[#e8f5f5] rounded-full px-8">
                Trouver un magasin
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;
