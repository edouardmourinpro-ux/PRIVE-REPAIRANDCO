import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SEO from '../components/SEO';
import { findArticle } from '../data/blog';

const SITE_URL = 'https://repairandco.fr';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
};

const buildBlogPostingSchema = (a) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: a.title,
  description: a.description,
  image: `${SITE_URL}${a.coverImage}`,
  datePublished: a.date,
  dateModified: a.lastUpdated || a.date,
  inLanguage: 'fr-FR',
  mainEntityOfPage: `${SITE_URL}/blog/${a.slug}`,
  author: { '@type': 'Organization', name: 'Repair&Co' },
  publisher: {
    '@type': 'Organization',
    name: 'Repair&Co',
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png` },
  },
  keywords: a.keywords,
});

const buildBreadcrumbSchema = (a) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
    { '@type': 'ListItem', position: 3, name: a.title },
  ],
});

const buildFaqSchema = (a) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: (a.faq || []).map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

const FAQItem = ({ q, a, index, isOpen, onToggle }) => (
  <div className="border-b border-[#1A5C3A]/10">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-start justify-between gap-4 py-4 sm:py-5 text-left"
      aria-expanded={isOpen}
      data-testid={`blog-faq-toggle-${index}`}
    >
      <h3 className="text-base sm:text-lg font-semibold text-[#1A5C3A]">{q}</h3>
      {isOpen
        ? <ChevronUp size={20} className="text-[#1A5C3A] mt-1 flex-shrink-0" />
        : <ChevronDown size={20} className="text-[#1A5C3A] mt-1 flex-shrink-0" />
      }
    </button>
    {isOpen && (
      <p className="pb-5 pr-8 text-[#1A1A2E]/85 leading-relaxed" data-testid={`blog-faq-answer-${index}`}>
        {a}
      </p>
    )}
  </div>
);

export default function BlogArticlePage() {
  const { slug } = useParams();
  const article = findArticle(slug);
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [slug]);

  if (!article) return <Navigate to="/blog" replace />;

  const { MainContent, outro: Outro } = article;
  const jsonLd = [
    buildBlogPostingSchema(article),
    buildBreadcrumbSchema(article),
    buildFaqSchema(article),
  ];

  return (
    <div className="bg-white" data-testid={`blog-article-${article.slug}`}>
      <SEO
        title={article.title}
        description={article.description}
        path={`/blog/${article.slug}`}
        image={`${SITE_URL}${article.coverImage}`}
        type="article"
        jsonLd={jsonLd}
      />

      {/* Breadcrumb */}
      <nav className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 text-xs text-[#1A1A2E]/60" aria-label="Fil d'ariane">
        <ol className="flex items-center gap-2 flex-wrap">
          <li><Link to="/" className="hover:text-[#1A5C3A]">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/blog" className="hover:text-[#1A5C3A]" data-testid="blog-breadcrumb-blog">Blog</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-[#1A5C3A] font-medium truncate max-w-[200px] sm:max-w-none">{article.title}</li>
        </ol>
      </nav>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-14">
        {/* Category tag */}
        <p className="uppercase tracking-[0.18em] text-xs font-semibold text-[#1A5C3A] mb-3">
          {article.category}
        </p>

        {/* Title (h1) */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A5C3A] leading-tight">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#1A1A2E]/70">
          <span>Par <strong className="text-[#1A1A2E]">{article.author}</strong></span>
          <span aria-hidden="true">•</span>
          <time dateTime={article.date}>Publié le {formatDate(article.date)}</time>
          {article.lastUpdated && article.lastUpdated !== article.date && (
            <>
              <span aria-hidden="true">•</span>
              <time dateTime={article.lastUpdated}>Mis à jour le {formatDate(article.lastUpdated)}</time>
            </>
          )}
          <span aria-hidden="true">•</span>
          <span>{article.readingTime} de lecture</span>
        </div>

        {/* Hero */}
        <figure className="mt-8 rounded-2xl overflow-hidden bg-[#E8F5EE]">
          <img
            src={article.coverImage}
            alt={article.coverImageAlt}
            loading="eager"
            fetchPriority="high"
            width="1200"
            height="630"
            className="w-full h-auto object-cover"
            data-testid="blog-hero-image"
          />
        </figure>

        {/* Body */}
        <div className="blog-prose text-[#1A1A2E] mt-10">
          <MainContent />

          {/* FAQ */}
          <h2>Foire aux questions</h2>
          <div className="not-prose mt-4 rounded-2xl border border-[#1A5C3A]/15 divide-y divide-[#1A5C3A]/10 px-5 sm:px-6">
            {article.faq.map((f, i) => (
              <FAQItem
                key={f.q}
                q={f.q}
                a={f.a}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>

          {/* Outro */}
          {Outro && <Outro />}
        </div>

        {/* Sources */}
        <section className="mt-12 pt-8 border-t border-[#1A5C3A]/15">
          <h2 className="text-xl sm:text-2xl font-bold text-[#1A5C3A] mb-4">Sources</h2>
          <ul className="space-y-2 text-sm text-[#1A1A2E]/80" data-testid="blog-sources">
            {article.sources.map((s) => (
              <li key={s.url} className="leading-relaxed">
                {s.label}, consulté le {s.date},{' '}
                <a
                  href={s.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="text-[#1A5C3A] underline decoration-[#2ECC71] decoration-2 underline-offset-4 hover:text-[#2ECC71] break-all"
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
