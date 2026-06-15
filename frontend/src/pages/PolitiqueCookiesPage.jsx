import { LegalPage } from '../components/LegalPage';
import content from '../content/legal/politique_cookies';

export default function PolitiqueCookiesPage() {
  return (
    <LegalPage
      slug="politique-cookies"
      title="Politique de gestion des cookies"
      description="Politique cookies du site repairandco.fr — cookies strictement nécessaires, mesure d'audience Google Analytics et gestion du consentement."
      content={content}
    />
  );
}
