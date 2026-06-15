import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { STORES } from '../../data/stores';
import { openPreferences } from '../../lib/consent';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  const footerStores = STORES.slice(0, 5);

  return (
    <footer data-testid="footer" className="bg-[#1A5C3A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          <div>
            <Link to="/" className="inline-block mb-6">
              <span className="text-2xl font-extrabold text-white tracking-tight">Repair<span className="text-[#2ECC71]">&</span>Co</span>
            </Link>
            <p className="text-white/85 leading-relaxed mb-6 text-sm">Votre expert en réparation d&apos;appareils électroniques partout en France. Smartphones, tablettes, PC et petit électroménager.</p>
            <img src="https://customer-assets.emergentagent.com/job_a9a1908d-07fe-49dd-8812-d3607942c5a0/artifacts/j50pewh4_logo-label-quali-repar-300x169-1.png" alt="Label QualiRépar" className="h-12 bg-white rounded-lg p-1" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Navigation</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="footer-link text-sm" data-testid="footer-home">Accueil</Link></li>
              <li><Link to="/services" className="footer-link text-sm" data-testid="footer-services">Nos services</Link></li>
              <li><Link to="/magasins" className="footer-link text-sm" data-testid="footer-stores">Nos magasins</Link></li>
              <li><Link to="/devis" className="footer-link text-sm" data-testid="footer-quote">Devis gratuit</Link></li>
              <li><Link to="/rendez-vous" className="footer-link text-sm" data-testid="footer-appointment">Rendez-vous</Link></li>
              <li><Link to="/rachat" className="footer-link text-sm" data-testid="footer-buyback">Rachat & Reconditionnés</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Entreprise</h4>
            <ul className="space-y-3">
              <li><Link to="/entreprises" className="footer-link text-sm" data-testid="footer-b2b">Services Entreprise</Link></li>
              <li><Link to="/qui-sommes-nous" className="footer-link text-sm" data-testid="footer-about">Qui sommes-nous ?</Link></li>
              <li><Link to="/faq" className="footer-link text-sm" data-testid="footer-faq">FAQ</Link></li>
              <li><Link to="/contact" className="footer-link text-sm" data-testid="footer-contact">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Nos magasins</h4>
            <ul className="space-y-4">
              {footerStores.map((store) => (
                <li key={store.id} className="flex items-start gap-2">
                  <MapPin size={16} className="text-[#2ECC71] mt-1 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium block text-sm">{store.name.replace('Repair&Co ', '')}</span>
                    <span className="text-white/60 text-xs">{store.city}</span>
                  </div>
                </li>
              ))}
              <li><Link to="/magasins" className="text-white hover:text-[#2ECC71] underline text-sm transition-colors">Voir les 9 magasins</Link></li>
            </ul>
          </div>
        </div>

        {/* Legal information section */}
        <div className="mt-12 pt-8 border-t border-white/15">
          <h4 className="text-sm font-semibold text-white/80 uppercase tracking-[0.15em] mb-5">
            Informations légales
          </h4>
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            <li>
              <Link
                to="/mentions-legales"
                data-testid="footer-mentions-legales"
                className="footer-link text-sm"
              >
                Mentions légales
              </Link>
            </li>
            <li>
              <Link
                to="/cgv"
                data-testid="footer-cgv"
                className="footer-link text-sm"
              >
                CGV
              </Link>
            </li>
            <li>
              <Link
                to="/politique-confidentialite"
                data-testid="footer-politique-confidentialite"
                className="footer-link text-sm"
              >
                Politique de confidentialité
              </Link>
            </li>
            <li>
              <Link
                to="/politique-cookies"
                data-testid="footer-politique-cookies"
                className="footer-link text-sm"
              >
                Politique de gestion des cookies
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={openPreferences}
                data-testid="footer-manage-cookies"
                className="footer-link text-sm underline decoration-[#2ECC71] decoration-2 underline-offset-4 hover:text-[#2ECC71]"
              >
                Gérer mes cookies
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/70 text-sm">&copy; {currentYear} Repair & Co. Tous droits réservés.</p>
            <p className="text-white/50 text-xs">VDMI REPAIR&CO GROUPE — SARL — SIRET 490 593 845 00012</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
