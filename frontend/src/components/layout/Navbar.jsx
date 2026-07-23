import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '../ui/button';

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setIsMobileMenuOpen(false); }, [location]);

  const navLinks = [
    { to: '/', label: 'Accueil' }, { to: '/services', label: 'Services' },
    { to: '/magasins', label: 'Magasins' }, { to: '/devis', label: 'Devis' },
    { to: '/rendez-vous', label: 'Rendez-vous' }, { to: '/rachat', label: 'Boutique' },
    { to: '/blog', label: 'Blog' },
  ];
  const isActive = (path) => location.pathname === path || (path === '/blog' && location.pathname.startsWith('/blog'));

  return (
    <>
      <nav data-testid="navbar" className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-3' : 'bg-white/95 backdrop-blur-sm py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" data-testid="logo-link" className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-[#1A5C3A] tracking-tight">Repair<span className="text-[#2ECC71]">&</span>Co</span>
            </Link>
            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} data-testid={`nav-${link.to.replace('/', '') || 'home'}`} className={`nav-link ${isActive(link.to) ? 'active' : ''}`}>{link.label}</Link>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/qui-sommes-nous" data-testid="nav-about"><Button variant="outline" className="border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full">Qui sommes-nous ?</Button></Link>
              <Link to="/entreprises" data-testid="nav-b2b"><Button className="bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full">Services Entreprise</Button></Link>
            </div>
            <button data-testid="mobile-menu-toggle" className="lg:hidden p-2 text-[#1A5C3A]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle menu">
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>
      <div data-testid="mobile-menu" className={`mobile-menu ${isMobileMenuOpen ? 'open' : 'closed'} lg:hidden`}>
        <div className="pt-20 px-6 pb-6 h-full overflow-y-auto">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} data-testid={`mobile-nav-${link.to.replace('/', '') || 'home'}`} className={`text-lg font-medium py-3 border-b border-[#E8F5EE] ${isActive(link.to) ? 'text-[#1A5C3A]' : 'text-[#1A1A2E]'}`}>{link.label}</Link>
            ))}
            <div className="pt-4 flex flex-col gap-3">
              <Link to="/qui-sommes-nous" data-testid="mobile-nav-about"><Button variant="outline" className="w-full border-[#1A5C3A] text-[#1A5C3A] hover:bg-[#E8F5EE] rounded-full">Qui sommes-nous ?</Button></Link>
              <Link to="/entreprises" data-testid="mobile-nav-b2b"><Button className="w-full bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full">Services Entreprise</Button></Link>
            </div>
            <div className="pt-6 border-t border-[#E8F5EE]">
              <a href="tel:0466848079" className="flex items-center gap-3 text-[#1A5C3A] font-medium"><Phone size={20} className="text-[#2ECC71]" /> 04 66 84 80 79</a>
            </div>
          </div>
        </div>
      </div>
      <div className="h-20" />
    </>
  );
};
