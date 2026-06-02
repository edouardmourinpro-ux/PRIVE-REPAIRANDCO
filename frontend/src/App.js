import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { Helmet, HelmetProvider } from "react-helmet-async";

// Pages
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import StoresPage from "./pages/StoresPage";
import QuotePage from "./pages/QuotePage";
import AppointmentPage from "./pages/AppointmentPage";
import BuybackPage from "./pages/BuybackPage";
import EnterprisePage from "./pages/EnterprisePage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Helmet>
          {/* Default SEO — overridden by per-page <SEO /> components */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <meta name="theme-color" content="#1A5C3A" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="author" content="Repair & Co" />
        </Helmet>
        
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/magasins" element={<StoresPage />} />
            <Route path="/devis" element={<QuotePage />} />
            <Route path="/rendez-vous" element={<AppointmentPage />} />
            <Route path="/rachat" element={<BuybackPage />} />
            <Route path="/entreprises" element={<EnterprisePage />} />
            <Route path="/qui-sommes-nous" element={<AboutPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact" element={<ContactPage />} />
            
            {/* Legal pages - placeholders */}
            <Route path="/mentions-legales" element={<LegalPage title="Mentions légales" />} />
            <Route path="/cgv" element={<LegalPage title="Conditions Générales de Vente" />} />
            <Route path="/rgpd" element={<LegalPage title="Politique de confidentialité" />} />
            
            {/* Admin */}
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  );
}

// Simple legal page placeholder
const LegalPage = ({ title }) => (
  <div className="py-16 lg:py-24 min-h-[60vh]">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-[#1A5C3A] mb-8">{title}</h1>
      <div className="prose prose-lg text-[#1A1A2E]/80">
        <p>
          Contenu à venir. Cette page sera complétée avec les informations légales 
          de Repair & Co.
        </p>
        <p className="mt-4">
          Pour toute question, contactez-nous à{' '}
          <a href="mailto:edouardmourinpro@gmail.com" className="text-[#1A5C3A] hover:text-[#2ECC71]">
            edouardmourinpro@gmail.com
          </a>
        </p>
      </div>
    </div>
  </div>
);

export default App;
