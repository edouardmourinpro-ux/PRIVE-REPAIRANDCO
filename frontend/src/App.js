import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ScrollToTop } from "./components/ScrollToTop";
import { Helmet, HelmetProvider } from "react-helmet-async";

// Pages
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import StoresPage from "./pages/StoresPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import QuotePage from "./pages/QuotePage";
import AppointmentPage from "./pages/AppointmentPage";
import BuybackPage from "./pages/BuybackPage";
import EnterprisePage from "./pages/EnterprisePage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import AdminPage from "./pages/AdminPage";
import MentionsLegalesPage from "./pages/MentionsLegalesPage";
import CGVPage from "./pages/CGVPage";
import PolitiqueConfidentialitePage from "./pages/PolitiqueConfidentialitePage";
import PolitiqueCookiesPage from "./pages/PolitiqueCookiesPage";
import BlogIndexPage from "./pages/BlogIndexPage";
import BlogArticlePage from "./pages/BlogArticlePage";

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
            <Route path="/magasins/:slug" element={<StoreDetailPage />} />
            <Route path="/devis" element={<QuotePage />} />
            <Route path="/rendez-vous" element={<AppointmentPage />} />
            <Route path="/rachat" element={<BuybackPage />} />
            <Route path="/entreprises" element={<EnterprisePage />} />
            <Route path="/qui-sommes-nous" element={<AboutPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* Blog */}
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
            
            {/* Legal pages */}
            <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
            <Route path="/cgv" element={<CGVPage />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialitePage />} />
            <Route path="/politique-cookies" element={<PolitiqueCookiesPage />} />
            {/* Legacy alias */}
            <Route path="/rgpd" element={<Navigate to="/politique-confidentialite" replace />} />
            
            {/* Admin */}
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
