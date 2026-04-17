import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { STORES } from '../../data/stores';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer data-testid="footer">
      {/* Green Banner - visually separated */}
      <div className="bg-[#005157] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xl font-bold text-white mb-3">
            Besoin d'une réparation ?
          </h3>
          <p className="text-white/80 mb-5 text-sm max-w-lg mx-auto">
            Nos techniciens sont disponibles pour vous aider dans nos 5 magasins du Sud de la France.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/devis"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-white text-[#005157] rounded-full font-semibold text-sm hover:bg-[#e8f5f5] transition-colors"
            >
              Devis gratuit
            </Link>
            <Link
              to="/rendez-vous"
              className="inline-flex items-center justify-center px-6 py-2.5 border-2 border-white text-white rounded-full font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              Prendre rendez-vous
            </Link>
          </div>
        </div>
      </div>

      {/* Separator line */}
      <div className="h-px bg-[#86cbd4]/40" />

      {/* Main Footer - slightly different shade */}
      <div className="bg-[#003d42] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <Link to="/" className="inline-block mb-6">
                <span className="text-2xl font-extrabold text-white tracking-tight">
                  Repair<span className="text-[#86cbd4]">&</span>Co
                </span>
              </Link>
              <p className="text-white/80 leading-relaxed mb-6">
                Votre expert en réparation d'appareils électroniques dans le Sud de la France. 
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
              <h4 className="text-lg font-semibold mb-6">Navigation</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/" className="footer-link" data-testid="footer-home">Accueil</Link>
                </li>
                <li>
                  <Link to="/services" className="footer-link" data-testid="footer-services">Nos services</Link>
                </li>
                <li>
                  <Link to="/magasins" className="footer-link" data-testid="footer-stores">Nos magasins</Link>
                </li>
                <li>
                  <Link to="/devis" className="footer-link" data-testid="footer-quote">Devis gratuit</Link>
                </li>
                <li>
                  <Link to="/rendez-vous" className="footer-link" data-testid="footer-appointment">Rendez-vous</Link>
                </li>
                <li>
                  <Link to="/rachat" className="footer-link" data-testid="footer-buyback">Rachat & Reconditionnés</Link>
                </li>
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Entreprise</h4>
              <ul className="space-y-3">
                <li>
                  <Link to="/entreprises" className="footer-link" data-testid="footer-b2b">Services Entreprise</Link>
                </li>
                <li>
                  <Link to="/qui-sommes-nous" className="footer-link" data-testid="footer-about">Qui sommes-nous</Link>
                </li>
                <li>
                  <Link to="/faq" className="footer-link" data-testid="footer-faq">FAQ</Link>
                </li>
                <li>
                  <Link to="/contact" className="footer-link" data-testid="footer-contact">Contact</Link>
                </li>
              </ul>
            </div>

            {/* Magasins */}
            <div>
              <h4 className="text-lg font-semibold mb-6">Nos magasins</h4>
              <ul className="space-y-4">
                {STORES.slice(0, 4).map((store) => (
                  <li key={store.id} className="flex items-start gap-2">
                    <MapPin size={16} className="text-[#86cbd4] mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-white font-medium block">{store.name}</span>
                      <span className="text-white/60 text-sm">{store.city}</span>
                    </div>
                  </li>
                ))}
                <li>
                  <Link to="/magasins" className="text-[#86cbd4] hover:underline text-sm">
                    Voir tous les magasins
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
                <Link to="/mentions-legales" className="text-white/60 hover:text-white transition-colors">
                  Mentions légales
                </Link>
                <Link to="/cgv" className="text-white/60 hover:text-white transition-colors">
                  CGV
                </Link>
                <Link to="/rgpd" className="text-white/60 hover:text-white transition-colors">
                  RGPD
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
