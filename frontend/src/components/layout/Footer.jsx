import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { STORES } from '../../data/stores';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const footerStores = STORES.slice(0, 5);

  return (
    <footer data-testid="footer" className="bg-[#003d42]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="inline-block mb-6">
              <span className="text-2xl font-extrabold text-white tracking-tight">
                Repair<span className="text-[#86cbd4]">&</span>Co
              </span>
            </Link>
            <p className="text-white/80 leading-relaxed mb-6 text-sm">
              Votre expert en réparation d'appareils électroniques partout en France. 
              Smartphones, tablettes, PC et petit électroménager.
            </p>
            <div className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png"
                alt="Label QualiRépar"
                className="h-12 bg-white rounded-lg p-1"
              />
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Navigation</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-home">Accueil</Link></li>
              <li><Link to="/services" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-services">Nos services</Link></li>
              <li><Link to="/magasins" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-stores">Nos magasins</Link></li>
              <li><Link to="/devis" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-quote">Devis gratuit</Link></li>
              <li><Link to="/rendez-vous" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-appointment">Rendez-vous</Link></li>
              <li><Link to="/rachat" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-buyback">Rachat & Reconditionnés</Link></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Entreprise</h4>
            <ul className="space-y-3">
              <li><Link to="/entreprises" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-b2b">Services Entreprise</Link></li>
              <li><Link to="/qui-sommes-nous" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-about">Qui sommes-nous</Link></li>
              <li><Link to="/faq" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-faq">FAQ</Link></li>
              <li><Link to="/contact" className="text-white/80 hover:text-[#86cbd4] transition-colors text-sm" data-testid="footer-contact">Contact</Link></li>
            </ul>
          </div>

          {/* Magasins */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Nos magasins</h4>
            <ul className="space-y-4">
              {footerStores.map((store) => (
                <li key={store.id} className="flex items-start gap-2">
                  <MapPin size={16} className="text-[#86cbd4] mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium block text-sm">{store.name.replace('Repair&Co ', '')}</span>
                    <span className="text-white/60 text-xs">{store.city}</span>
                  </div>
                </li>
              ))}
              <li>
                <Link to="/magasins" className="text-white hover:text-[#86cbd4] underline text-sm transition-colors">
                  Voir les 9 magasins
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/60 text-sm">
              &copy; {currentYear} Repair & Co. Tous droits réservés.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/mentions-legales" className="text-white/60 hover:text-white transition-colors">Mentions légales</Link>
              <Link to="/cgv" className="text-white/60 hover:text-white transition-colors">CGV</Link>
              <Link to="/rgpd" className="text-white/60 hover:text-white transition-colors">RGPD</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
