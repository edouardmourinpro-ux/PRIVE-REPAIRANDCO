import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { ARTICLES } from '../data/blog';

const formatDate = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
};

export default function BlogIndexPage() {
  const items = ARTICLES;
  return (
    <div className="bg-white" data-testid="blog-index-page">
      <SEO
        title="Blog Repair & Co — Guides de réparation par modèle"
        description="Guides Repair & Co pour comprendre les prix, les délais et les bonnes pratiques de réparation smartphone, tablette et PC en 2026."
        path="/blog"
      />

      {/* Header */}
      <header className="bg-[#E8F5EE] border-b border-[#1A5C3A]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <p className="uppercase tracking-[0.18em] text-xs font-semibold text-[#1A5C3A] mb-3">
            Blog Repair &amp; Co
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A5C3A] leading-tight">
            Guides de réparation, prix &amp; bons plans
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#1A1A2E]/80 max-w-2xl">
            Tout ce qu&apos;il faut savoir avant de faire réparer votre appareil :
            fourchettes de prix, bonus réparation, délais et garanties.
          </p>
        </div>
      </header>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {items.map((a) => (
            <Link
              key={a.slug}
              to={`/blog/${a.slug}`}
              data-testid={`blog-card-${a.slug}`}
              className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-[#1A5C3A]/10 hover:border-[#2ECC71] hover:shadow-lg transition-all"
            >
              <div className="aspect-[1200/630] bg-[#E8F5EE] overflow-hidden">
                <img
                  src={a.coverImage}
                  alt={a.coverImageAlt}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                  width="1200"
                  height="630"
                />
              </div>
              <div className="p-5 sm:p-6 flex flex-col flex-1">
                <p className="text-xs text-[#1A5C3A] font-semibold uppercase tracking-wider mb-2">
                  {a.category} · {a.readingTime}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold text-[#1A5C3A] leading-snug group-hover:text-[#2ECC71] transition-colors">
                  {a.title}
                </h2>
                <p className="mt-3 text-sm text-[#1A1A2E]/80 leading-relaxed line-clamp-3">
                  {a.description}
                </p>
                <p className="mt-4 text-xs text-[#1A1A2E]/60">
                  {formatDate(a.date)} · {a.author}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
