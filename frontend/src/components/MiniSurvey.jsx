import { useState } from 'react';
import axios from 'axios';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { Button } from './ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SOURCE_OPTIONS = [
  { value: 'google', label: 'Google' },
  { value: 'reseaux_sociaux', label: 'Réseaux sociaux' },
  { value: 'bouche_a_oreille', label: 'Bouche à oreille' },
  { value: 'passage_magasin', label: 'En passant devant le magasin' },
  { value: 'autre', label: 'Autre' },
];

/**
 * Mini-enquête post-soumission (2 questions).
 * Apparaît sur la page de confirmation pour collecter customer_source + customer_feedback.
 *
 * Props:
 * - demandId: id de la demande créée
 * - category: 'devis' | 'contact' | 'entreprise' | 'rachat'
 * - onDone: callback optionnel après envoi/skip
 */
const MiniSurvey = ({ demandId, category, onDone }) => {
  const [source, setSource] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!demandId || !category) return null;

  const submit = async () => {
    if (!source && !feedback.trim()) {
      // Nothing to send → skip silently
      setDone(true);
      onDone?.();
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/demandes/${category}/${demandId}/survey`, {
        customer_source: source || null,
        customer_feedback: feedback.trim() || null,
      });
      setDone(true);
      onDone?.();
    } catch (e) {
      // Fail silently — user has already submitted main demand
      setDone(true);
      onDone?.();
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    setDone(true);
    onDone?.();
  };

  if (done) {
    return (
      <div className="mt-8 p-5 rounded-2xl bg-[#E8F5EE] border border-[#2ECC71]/30 flex items-center justify-center gap-2 text-[#1A5C3A] font-medium" data-testid="mini-survey-thanks">
        <Check size={18} />
        <span>Merci pour votre retour !</span>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 rounded-2xl bg-white border border-[#E8F5EE] shadow-sm text-left" data-testid="mini-survey">
      <div className="flex items-center gap-2 mb-1 text-[#1A5C3A]">
        <Sparkles size={18} />
        <h3 className="font-semibold text-base">Aidez-nous à nous améliorer (30 sec.)</h3>
      </div>
      <p className="text-xs text-[#1A1A2E]/60 mb-5">Vos réponses sont anonymes pour notre équipe et facultatives.</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">Comment nous avez-vous connus ?</label>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E8F5EE] rounded-lg text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71]"
            data-testid="survey-source"
          >
            <option value="">— Choisir —</option>
            {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A1A2E] mb-1.5">
            Un point que vous n'avez pas aimé ou pas compris sur le site ?
          </label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
            placeholder="On veut s'améliorer ! (facultatif)"
            className="w-full px-3 py-2.5 border border-[#E8F5EE] rounded-lg text-sm text-[#1A1A2E] bg-white focus:outline-none focus:border-[#2ECC71] resize-none"
            data-testid="survey-feedback"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={submit}
            disabled={submitting}
            className="flex-1 bg-[#1A5C3A] text-white hover:bg-[#2ECC71] rounded-full"
            data-testid="survey-submit"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Envoyer mon retour'}
          </Button>
          <Button
            onClick={skip}
            variant="outline"
            disabled={submitting}
            className="flex-1 border-[#E8F5EE] text-[#1A1A2E]/70 hover:bg-[#E8F5EE] rounded-full"
            data-testid="survey-skip"
          >
            Passer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MiniSurvey;
