import { Link } from 'react-router-dom';

// External-link helper: opens in a new tab, adds nofollow so we cite sources
// without transmitting SEO juice to other repair shops.
const Ext = ({ href, children }) => (
  <a
    href={href}
    target="_blank"
    rel="nofollow noopener noreferrer"
    className="text-[#1A5C3A] underline decoration-[#2ECC71] decoration-2 underline-offset-4 hover:text-[#2ECC71] transition-colors"
  >
    {children}
  </a>
);

// Internal-link helper (routes only — every href here must resolve to a real
// React-Router path in App.js).
const Int = ({ to, children, testid }) => (
  <Link
    to={to}
    data-testid={testid}
    className="text-[#1A5C3A] underline decoration-[#2ECC71] decoration-2 underline-offset-4 hover:text-[#2ECC71] transition-colors font-medium"
  >
    {children}
  </Link>
);

const Callout = ({ children }) => (
  <aside
    className="my-8 bg-[#E8F5EE] border-l-4 border-[#2ECC71] rounded-r-xl p-5 sm:p-6"
    aria-label="L'essentiel"
  >
    {children}
  </aside>
);

const CTAButtons = () => (
  <div className="my-8 flex flex-col sm:flex-row gap-3">
    <Link
      to="/devis"
      data-testid="blog-cta-devis"
      className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#1A5C3A] text-white font-semibold hover:bg-[#2ECC71] transition-colors text-center"
    >
      Devis gratuit sur mon iPhone
    </Link>
    <Link
      to="/rendez-vous"
      data-testid="blog-cta-rdv"
      className="inline-flex items-center justify-center px-6 py-3 rounded-full border-2 border-[#1A5C3A] text-[#1A5C3A] font-semibold hover:bg-[#E8F5EE] transition-colors text-center"
    >
      Prendre rendez-vous
    </Link>
  </div>
);

const MainContent = () => (
  <>
    <p>
      Votre écran d&apos;iPhone est fissuré et vous vous demandez ce que ça va vous coûter ?
      En 2026, comptez de <strong>60 à 350 €</strong> selon le modèle, avec une différence
      énorme entre un vieil iPhone SE et un iPhone 16 Pro Max. Bonne nouvelle : l&apos;État
      déduit <strong>25 € directement de votre facture</strong>, sans aucune démarche. Ce
      guide vous donne les fourchettes réelles, modèle par modèle, et vous explique pourquoi
      l&apos;écart est aussi grand.
    </p>

    <Callout>
      <p className="font-bold text-[#1A5C3A] mb-2">L&apos;essentiel</p>
      <ul className="space-y-2 text-[#1A1A2E]/90">
        <li>Réparer un écran d&apos;iPhone coûte entre <strong>60 et 350 €</strong> en 2026, selon le modèle et la qualité de la pièce (<Ext href="https://wanitek.fr/blog/blog-reparation-ecran-iphone/">Wanitek</Ext>, 2026).</li>
        <li>Le <strong>bonus réparation</strong> de l&apos;État déduit <strong>25 €</strong> de la facture d&apos;un écran ou d&apos;une batterie, appliqué automatiquement chez un réparateur labellisé QualiRépar (<Ext href="https://www.ecosystem.eco/reparer/equipement/smartphone-et-tablette">ecosystem</Ext>, 2026).</li>
        <li>Réparer reste <strong>3 à 5 fois moins cher</strong> que racheter un smartphone neuf équivalent.</li>
        <li>Le prix dépend surtout de la dalle : un écran <strong>OLED</strong> de modèle Pro coûte bien plus qu&apos;un ancien <strong>LCD</strong>.</li>
      </ul>
    </Callout>

    <h2>Combien coûte la réparation d&apos;un écran d&apos;iPhone en 2026 ?</h2>
    <p>
      En 2026, la réparation d&apos;un écran d&apos;iPhone coûte entre <strong>60 et 350 €</strong>
      selon le modèle (<Ext href="https://wanitek.fr/blog/blog-reparation-ecran-iphone/">Wanitek</Ext>, 2026).
      Les anciens iPhone à dalle LCD restent bon marché. Les récents modèles Pro, avec leur
      écran OLED haut de gamme, tirent la facture vers le haut. Voici les fourchettes de
      marché, par gamme.
    </p>
    <p>
      Le prix d&apos;un écran d&apos;iPhone en 2026 suit une règle simple : plus le modèle est
      récent et haut de gamme, plus la dalle coûte cher à remplacer. Les fourchettes de marché
      vont d&apos;environ 60 € pour un iPhone SE à 350 € pour un iPhone 16 Pro Max
      (<Ext href="https://wanitek.fr/blog/blog-reparation-ecran-iphone/">Wanitek</Ext>, 2026).
      Ces montants s&apos;entendent <strong>avant</strong> le bonus réparation.
    </p>

    <div className="my-6 overflow-x-auto rounded-xl border border-[#1A5C3A]/15" data-testid="blog-price-table-wrapper">
      <table className="w-full text-sm text-left">
        <thead className="bg-[#E8F5EE]">
          <tr>
            <th className="px-4 py-3 text-[#1A5C3A] font-semibold text-xs uppercase tracking-wide">Modèle</th>
            <th className="px-4 py-3 text-[#1A5C3A] font-semibold text-xs uppercase tracking-wide">Fourchette de prix (2026)</th>
            <th className="px-4 py-3 text-[#1A5C3A] font-semibold text-xs uppercase tracking-wide">Type de dalle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A5C3A]/10">
          {[
            ['iPhone SE (2ᵉ/3ᵉ gén.)', '60 – 100 €', 'LCD'],
            ['iPhone XR / X / 11', '70 – 130 €', 'LCD / OLED'],
            ['iPhone 12 / 12 Mini', '80 – 150 €', 'OLED'],
            ['iPhone 13 / 13 Mini', '100 – 180 €', 'OLED'],
            ['iPhone 14 / 14 Plus', '130 – 220 €', 'OLED'],
            ['iPhone 15 / 15 Plus', '150 – 250 €', 'OLED'],
            ['iPhone 16 / 16 Plus', '180 – 280 €', 'OLED'],
            ['iPhone 13 Pro / Pro Max', '140 – 220 €', 'OLED ProMotion'],
            ['iPhone 14 Pro / Pro Max', '180 – 280 €', 'OLED ProMotion'],
            ['iPhone 15 Pro / Pro Max', '200 – 300 €', 'OLED ProMotion'],
            ['iPhone 16 Pro / Pro Max', '250 – 350 €', 'OLED ProMotion'],
          ].map(([m, p, d]) => (
            <tr key={m} className="align-top">
              <td className="px-4 py-3 text-[#1A1A2E]/90 font-medium">{m}</td>
              <td className="px-4 py-3 text-[#1A1A2E]/90">{p}</td>
              <td className="px-4 py-3 text-[#1A1A2E]/70">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <figure className="my-8">
      <svg viewBox="0 0 640 340" role="img" aria-label="Fourchettes de prix de réparation d'écran iPhone par gamme en 2026 : anciens LCD 60 à 130 euros, milieu de gamme OLED 80 à 180 euros, récents OLED 130 à 280 euros, Pro et Pro Max 140 à 350 euros" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto', fontFamily: 'system-ui, sans-serif' }}>
        <text x="20" y="28" fill="currentColor" fontSize="17" fontWeight="700">Prix d&apos;un écran iPhone selon la gamme (2026, €)</text>
        <line x1="150" y1="70" x2="150" y2="300" stroke="currentColor" strokeOpacity="0.25" />
        <text x="140" y="98" fill="currentColor" fontSize="13" textAnchor="end">Anciens (LCD)</text>
        <rect x="228" y="86" width="91" height="18" rx="3" fill="#ea580c" fillOpacity="0.85" />
        <text x="329" y="99" fill="currentColor" fontSize="12">60–130 €</text>
        <text x="140" y="140" fill="currentColor" fontSize="13" textAnchor="end">Milieu (OLED)</text>
        <rect x="254" y="128" width="130" height="18" rx="3" fill="#ea580c" fillOpacity="0.85" />
        <text x="394" y="141" fill="currentColor" fontSize="12">80–180 €</text>
        <text x="140" y="182" fill="currentColor" fontSize="13" textAnchor="end">Récents (OLED)</text>
        <rect x="319" y="170" width="195" height="18" rx="3" fill="#ea580c" />
        <text x="524" y="183" fill="currentColor" fontSize="12">130–280 €</text>
        <text x="140" y="224" fill="currentColor" fontSize="13" textAnchor="end">Pro / Pro Max</text>
        <rect x="332" y="212" width="273" height="18" rx="3" fill="#c2410c" />
        <text x="410" y="252" fill="currentColor" fontSize="12">140–350 €</text>
        <text x="20" y="326" fill="currentColor" fontSize="11" fillOpacity="0.7">Source : fourchettes de marché Wanitek, 2026. Montants avant bonus réparation.</text>
      </svg>
      <figcaption className="text-sm text-[#1A1A2E]/60 mt-2">
        Fourchettes de prix par gamme d&apos;iPhone — Source : Wanitek, 2026.
      </figcaption>
    </figure>

    <p>
      À titre de comparaison, un réparateur comme iRep affiche des tarifs précis allant de
      59 € pour un iPhone ancien à 289 € pour un iPhone 16 Pro Max, avant déduction du bonus
      (<Ext href="https://i-rep.fr/prix-reparation-iphone/">iRep</Ext>, 2026). Les écarts
      d&apos;un magasin à l&apos;autre viennent surtout de la qualité de la pièce et de la
      garantie proposée. Pour connaître le prix exact de <strong>votre</strong> modèle, le
      plus fiable reste un devis gratuit en magasin.
    </p>
    <p>
      Pour tout savoir sur les pannes, les délais et les garanties, consultez notre{' '}
      <Int to="/services" testid="blog-link-services-1">page réparation smartphone</Int>.
    </p>

    <h2>Pourquoi un tel écart de prix entre les modèles ?</h2>
    <p>
      L&apos;écart vient presque entièrement de la dalle. Le <strong>LCD</strong> est
      l&apos;ancienne technologie d&apos;affichage, peu coûteuse à remplacer. L&apos;<strong>OLED</strong>{' '}
      est la dalle des iPhone récents : plus chère, mais bien plus contrastée. Un écran OLED
      de modèle Pro peut dépasser 300 € à lui seul (<Ext href="https://www.lesmobiles.com/">lesmobiles</Ext>, 2026).
      La technologie d&apos;affichage explique donc l&apos;essentiel de la facture, bien avant
      la main-d&apos;œuvre.
    </p>
    <p>
      Trois facteurs font grimper le prix. D&apos;abord la dalle : les modèles récents utilisent
      l&apos;OLED, qui offre de meilleures couleurs mais coûte cher. Ensuite la gamme : les
      modèles <strong>Pro</strong> embarquent une dalle OLED <strong>ProMotion</strong> (120 Hz),
      plus onéreuse. Enfin la qualité de la pièce de rechange : une pièce d&apos;origine ou
      premium se paie plus qu&apos;une pièce compatible d&apos;entrée de gamme.
    </p>
    <p>
      Concrètement, une même panne — un écran fissuré — peut coûter du simple au quintuple.
      Un iPhone SE part de 60 €, un iPhone 16 Pro Max grimpe à 350 €
      (<Ext href="https://wanitek.fr/blog/blog-reparation-ecran-iphone/">Wanitek</Ext>, 2026).
      Ce n&apos;est pas la difficulté du geste qui change, c&apos;est le prix de la dalle OLED
      haut de gamme qu&apos;il faut poser.
    </p>

    <blockquote className="my-6 border-l-4 border-[#1A5C3A] bg-white pl-5 pr-4 py-4 italic text-[#1A1A2E]/90">
      <strong className="not-italic text-[#1A5C3A]">Notre constat d&apos;atelier :</strong>{' '}
      dans nos ateliers, nous avons remplacé des milliers d&apos;écrans, et la fissure reste la
      panne numéro un, tous modèles confondus. D&apos;après notre expérience, dans la majorité
      des cas seules la vitre et la dalle sont touchées : le reste du téléphone fonctionne
      parfaitement. Réparer, c&apos;est repartir avec le même appareil, vos données intactes.
    </blockquote>

    <p>
      Un doute entre l&apos;écran et la batterie ? Découvrez{' '}
      <Int to="/services" testid="blog-link-services-2">nos services de réparation</Int>.
    </p>

    <h2>Comment le bonus réparation fait baisser la facture ?</h2>
    <p>
      <strong>Le bonus réparation</strong> est une aide de l&apos;État qui déduit <strong>25 €</strong>
      de la facture d&apos;une réparation d&apos;écran ou de batterie de smartphone, chez un
      réparateur labellisé (<Ext href="https://www.ecosystem.eco/reparer/equipement/smartphone-et-tablette">ecosystem</Ext>, 2026).
      <strong> QualiRépar</strong> est le label national qui identifie les réparateurs
      éligibles. La déduction est <strong>automatique</strong> : vous n&apos;avez aucun dossier
      à remplir, aucune avance à faire. Le réparateur applique la remise directement sur votre
      note.
    </p>
    <p>
      Le bonus réparation est sans doute l&apos;aide la plus simple qui existe. Vous apportez
      votre téléphone chez un réparateur labellisé QualiRépar, il répare, et il retire 25 € du
      total. Aucune démarche préalable, aucun justificatif à envoyer
      (<Ext href="https://quefairedemesdechets.ademe.fr/bonus-reparation/">ademe</Ext>, 2026).
      La facture mentionne le bonus appliqué et sert de preuve de garantie.
    </p>
    <p>
      Quelques conditions s&apos;appliquent tout de même. L&apos;appareil doit être hors
      garantie constructeur, la réparation doit dépasser le montant du bonus, et vous ne devez
      pas déjà être couvert par une assurance pour cette même panne
      (<Ext href="https://reparation.pro/blog/bonus-reparation-qualirepar-guide">reparation.pro</Ext>, 2026).
      Sur un écran d&apos;iPhone récent à 200 €, le bonus ramène donc la note à 175 €.
    </p>
    <p>
      Pour les conditions détaillées, renseignez-vous auprès de{' '}
      <Int to="/magasins" testid="blog-link-magasins-1">votre magasin Repair&amp;Co</Int> : nos
      équipes appliquent le bonus et vous guident.
    </p>

    <h2>Réparer ou racheter : que dit le calcul ?</h2>
    <p>
      Réparer est presque toujours le choix le plus économique. Une réparation d&apos;écran
      coûte <strong>3 à 5 fois moins cher</strong> que le rachat d&apos;un smartphone neuf
      équivalent (<Ext href="https://iclinique-shop.fr/blogs/conseils-et-reparations/reparation-ecran-iphone-prix-2025-conseils-et-bon-plan-pour-ne-pas-se-faire-avoir">iclinique</Ext>, 2025).
      Face à un écran à 200 € contre un neuf à 900 €, le calcul est vite fait.
    </p>
    <p>
      Prenons un exemple concret. Un iPhone 15 neuf se négocie autour de 900 €. Réparer son
      écran coûte de 150 à 250 €, bonus déduit
      (<Ext href="https://wanitek.fr/blog/blog-reparation-ecran-iphone/">Wanitek</Ext>, 2026).
      Vous gardez votre appareil, vos données, vos applications — et vous évitez de produire
      un déchet électronique de plus. Le seul cas où racheter se discute, c&apos;est quand
      plusieurs pannes lourdes s&apos;additionnent sur un très vieux modèle.
    </p>
    <p>
      Et si vous voulez changer sans acheter du neuf, le reconditionné est une troisième voie.
      Un <strong>smartphone reconditionné</strong> est un appareil d&apos;occasion remis à neuf
      et garanti : il coûte 20 à 50 % de moins qu&apos;un neuf, avec une garantie légale de
      deux ans minimum
      (<Ext href="https://www.selectronic.fr/produits/smartphone/smartphone-reconditionne-fiable-en-2026-guide-complet-et-conseils/">Selectronic</Ext>, 2026).
      Réparer, garder, ou passer au reconditionné : dans les trois cas, vous gagnez face au neuf.
    </p>

    <figure className="my-8">
      <svg viewBox="0 0 640 260" role="img" aria-label="Comparaison illustrative des coûts : réparer un écran d'iPhone 15 environ 175 euros bonus déduit, contre racheter un iPhone 15 neuf environ 900 euros" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%', height: 'auto', fontFamily: 'system-ui, sans-serif' }}>
        <text x="20" y="28" fill="currentColor" fontSize="17" fontWeight="700">Réparer l&apos;écran vs racheter neuf (iPhone 15, exemple)</text>
        <text x="188" y="92" fill="currentColor" fontSize="13" textAnchor="end">Réparer l&apos;écran</text>
        <rect x="200" y="78" width="105" height="26" rx="4" fill="#16a34a" />
        <text x="315" y="96" fill="currentColor" fontSize="13" fontWeight="600">≈ 175 € (bonus déduit)</text>
        <text x="188" y="152" fill="currentColor" fontSize="13" textAnchor="end">Racheter neuf</text>
        <rect x="200" y="138" width="540" height="26" rx="4" fill="#dc2626" />
        <text x="470" y="156" fill="#ffffff" fontSize="13" fontWeight="600" textAnchor="middle">≈ 900 €</text>
        <text x="20" y="212" fill="currentColor" fontSize="11" fillOpacity="0.7">Exemple illustratif. Prix réparation : Wanitek 2026 (bonus 25 € déduit). Prix neuf : tarif indicatif marché.</text>
      </svg>
      <figcaption className="text-sm text-[#1A1A2E]/60 mt-2">Comparaison illustrative des coûts pour un iPhone 15.</figcaption>
    </figure>

    <p>
      Et pour financer un changement, pensez à{' '}
      <Int to="/rachat" testid="blog-link-rachat">la reprise de votre ancien téléphone</Int>.
    </p>

    <h2>Où faire réparer l&apos;écran de votre iPhone au juste prix ?</h2>
    <p>
      Le bon réparateur combine trois choses : un <strong>devis gratuit clair</strong>, une{' '}
      <strong>pièce de qualité garantie</strong>, et le <strong>label QualiRépar</strong> pour
      bénéficier du bonus. Un réseau de magasins physiques vous permet aussi d&apos;être
      conseillé en face-à-face, d&apos;apporter votre téléphone sans rendez-vous, et de repartir
      avec un interlocuteur identifié en cas de souci.
    </p>
    <p>
      Chez Repair&amp;Co, chaque réparation démarre par un{' '}
      <Int to="/devis" testid="blog-link-devis-1">devis gratuit</Int> sur votre modèle exact —
      pas d&apos;estimation floue au téléphone. Nos magasins sont labellisés pour appliquer le
      bonus réparation, et la main-d&apos;œuvre est comprise dans le prix annoncé. Vous voyez
      la pièce, vous validez, on répare. C&apos;est aussi simple que ça.
    </p>
    <p className="italic text-[#1A1A2E]/80">
      Nous l&apos;observons tous les jours : l&apos;avantage d&apos;un magasin de proximité,
      c&apos;est le suivi. Si un point de détail vous chiffonne après la réparation, vous
      repassez nous voir — pas de colis à renvoyer, pas de service client anonyme à
      l&apos;autre bout du fil.
    </p>
    <p>
      Envie d&apos;un devis ? Trouvez{' '}
      <Int to="/magasins" testid="blog-link-magasins-2">le magasin Repair&amp;Co le plus proche de chez vous</Int>.
    </p>

    <CTAButtons />
  </>
);

const article = {
  slug: 'prix-reparation-ecran-iphone',
  title: 'Prix réparation écran iPhone 2026 : le guide par modèle',
  description: "Combien coûte un écran d'iPhone en 2026 ? Fourchettes par modèle (60 à 350 €), le rôle de l'OLED, et 25 € de bonus réparation déduits automatiquement.",
  coverImage: '/blog/hero.png',
  coverImageAlt: "Technicien remplaçant un écran d'iPhone fissuré sur un établi de réparation, avec outils de précision",
  date: '2026-07-18',
  lastUpdated: '2026-07-18',
  author: "L'équipe technique Repair&Co",
  tags: ['réparation écran iphone', 'prix réparation iphone', 'bonus réparation', 'réparation smartphone'],
  keywords: 'prix réparation écran iphone, bonus réparation, réparation smartphone, écran OLED',
  category: 'Réparation smartphone',
  categoryPath: '/services',
  readingTime: '6 min',
  MainContent,
  faq: [
    {
      q: "Quel est le prix moyen d'une réparation d'écran d'iPhone en 2026 ?",
      a: "En 2026, comptez entre 60 et 350 € selon le modèle. Les anciens iPhone à dalle LCD sont les moins chers ; les modèles Pro récents, en OLED ProMotion, sont les plus coûteux. Le bonus réparation retire ensuite 25 € de la facture.",
    },
    {
      q: "Le bonus réparation s'applique-t-il à un écran d'iPhone ?",
      a: "Oui. Le remplacement d'écran fait partie des réparations éligibles au bonus réparation, tout comme le changement de batterie. La déduction de 25 € est automatique chez un réparateur labellisé QualiRépar, sans démarche de votre part.",
    },
    {
      q: "Pourquoi l'écran d'un iPhone Pro coûte-t-il plus cher à réparer ?",
      a: "Parce que sa dalle est plus chère. Les modèles Pro embarquent un écran OLED ProMotion à 120 Hz, dont le remplacement peut à lui seul dépasser 300 €. La main-d'œuvre, elle, varie peu : c'est le composant qui fait la différence.",
    },
    {
      q: "Vaut-il mieux réparer ou racheter un iPhone à l'écran cassé ?",
      a: "Réparer, dans la grande majorité des cas. Une réparation d'écran coûte 3 à 5 fois moins cher qu'un smartphone neuf équivalent. Vous conservez votre appareil et vos données, et vous évitez un déchet électronique.",
    },
    {
      q: "Combien de temps prend une réparation d'écran ?",
      a: "Sur la plupart des modèles, le remplacement d'un écran se fait en moins d'une heure, souvent en moins de 30 minutes en atelier équipé. Le délai dépend du modèle et de la disponibilité de la pièce.",
    },
  ],
  sources: [
    { label: 'Wanitek, « Prix réparation écran iPhone : tarifs 2026 par modèle »', url: 'https://wanitek.fr/blog/blog-reparation-ecran-iphone/', date: '2026-07-18' },
    { label: 'iRep, « Prix de réparation iPhone »', url: 'https://i-rep.fr/prix-reparation-iphone/', date: '2026-07-18' },
    { label: 'ecosystem, « Bonus Réparation des téléphones mobiles — Label QualiRépar »', url: 'https://www.ecosystem.eco/reparer/equipement/smartphone-et-tablette', date: '2026-07-18' },
    { label: 'ADEME, « Bonus Réparation »', url: 'https://quefairedemesdechets.ademe.fr/bonus-reparation/', date: '2026-07-18' },
    { label: 'Réparation.pro, « Bonus QualiRépar 2026 : Guide et Conditions »', url: 'https://reparation.pro/blog/bonus-reparation-qualirepar-guide', date: '2026-07-18' },
    { label: 'iClinique, « Réparation écran iPhone : prix 2025, conseils et bon plan »', url: 'https://iclinique-shop.fr/blogs/conseils-et-reparations/reparation-ecran-iphone-prix-2025-conseils-et-bon-plan-pour-ne-pas-se-faire-avoir', date: '2026-07-18' },
    { label: 'Selectronic, « Smartphone reconditionné fiable en 2026 : guide complet »', url: 'https://www.selectronic.fr/produits/smartphone/smartphone-reconditionne-fiable-en-2026-guide-complet-et-conseils/', date: '2026-07-18' },
  ],
  outro: () => (
    <>
      <h2>En résumé</h2>
      <p>
        Réparer l&apos;écran de votre iPhone en 2026, c&apos;est un budget compris entre 60 et
        350 € selon le modèle, moins 25 € de bonus réparation appliqués automatiquement. L&apos;OLED
        des modèles Pro explique l&apos;essentiel de l&apos;écart de prix. Et dans presque tous
        les cas, réparer reste bien plus intelligent que racheter.
      </p>
      <p>
        Le réflexe le plus sûr : demandez un{' '}
        <Int to="/devis" testid="blog-link-devis-2">devis gratuit</Int> sur votre modèle exact
        avant de décider, ou{' '}
        <Int to="/rendez-vous" testid="blog-link-rdv">prenez rendez-vous en magasin</Int>. Vous
        saurez le prix à l&apos;euro près, bonus compris, et vous repartirez avec un appareil
        comme neuf.
      </p>
      <p>
        Retrouvez{' '}
        <Int to="/blog" testid="blog-link-blog">tous nos guides de réparation par modèle</Int>{' '}
        pour préparer votre visite.
      </p>
    </>
  ),
};

export default article;
