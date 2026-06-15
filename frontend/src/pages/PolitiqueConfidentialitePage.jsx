import { LegalPage } from '../components/LegalPage';
import content from '../content/legal/politique_confidentialite';

export default function PolitiqueConfidentialitePage() {
  return (
    <LegalPage
      slug="politique-confidentialite"
      title="Politique de confidentialité"
      description="Politique de confidentialité Repair & Co — RGPD : données collectées, finalités, durées de conservation et exercice de vos droits."
      content={content}
    />
  );
}
