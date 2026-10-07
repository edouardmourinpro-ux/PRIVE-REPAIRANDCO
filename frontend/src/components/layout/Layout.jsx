import { useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { CookieBanner } from './CookieBanner';
import { Toaster } from '../ui/sonner';

export const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <CookieBanner />}
      <Toaster position="top-right" />
    </div>
  );
};
