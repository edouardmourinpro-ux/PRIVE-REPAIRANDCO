import { LegalPage } from '../components/LegalPage';
import content from '../content/legal/cgv';

export default function CGVPage() {
  return (
    <LegalPage
      slug="cgv"
      title="Conditions Générales de Vente"
      description="Conditions Générales de Vente et de Prestation de Services Repair & Co : devis, réparation, garantie, droit de rétractation, médiation."
      content={content}
    />
  );
}
