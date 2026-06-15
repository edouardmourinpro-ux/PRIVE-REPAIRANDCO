import { LegalPage } from '../components/LegalPage';
import content from '../content/legal/mentions_legales';

export default function MentionsLegalesPage() {
  return (
    <LegalPage
      slug="mentions-legales"
      title="Mentions légales"
      description="Mentions légales du site repairandco.fr — éditeur VDMI REPAIR&CO GROUPE, hébergement, propriété intellectuelle."
      content={content}
    />
  );
}
