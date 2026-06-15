import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useMemo } from 'react';
import { SEO } from './SEO';

// Maps original markdown relative links to actual React-Router paths so that
// links between legal documents keep working.
const linkMap = {
  './politique-confidentialite.md': '/politique-confidentialite',
  './politique-cookies.md': '/politique-cookies',
  './cgv.md': '/cgv',
  './mentions-legales.md': '/mentions-legales',
};

const remapHref = (href = '') => linkMap[href] || href;

// Stable component definitions (outside the render fn) — React 18 / eslint
// require this, otherwise the markdown tree is remounted on every render.
const MdH2 = (props) => (
  <h2
    className="text-2xl sm:text-3xl font-bold text-[#1A5C3A] mt-12 mb-4 scroll-mt-24"
    {...props}
  />
);
const MdH3 = (props) => (
  <h3 className="text-xl font-semibold text-[#1A5C3A] mt-8 mb-3" {...props} />
);
const MdH4 = (props) => (
  <h4 className="text-lg font-semibold text-[#1A1A2E] mt-6 mb-2" {...props} />
);
const MdP = (props) => (
  <p className="text-base leading-relaxed text-[#1A1A2E]/90 my-4" {...props} />
);
const MdUl = (props) => (
  <ul
    className="list-disc pl-6 my-4 space-y-2 text-[#1A1A2E]/90 marker:text-[#2ECC71]"
    {...props}
  />
);
const MdOl = (props) => (
  <ol
    className="list-decimal pl-6 my-4 space-y-2 text-[#1A1A2E]/90 marker:text-[#1A5C3A]"
    {...props}
  />
);
const MdLi = (props) => <li className="leading-relaxed" {...props} />;
const MdA = ({ href, children, ...rest }) => {
  const mapped = remapHref(href);
  const isExternal = mapped.startsWith('http') || mapped.startsWith('mailto:');
  return (
    <a
      href={mapped}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="text-[#1A5C3A] underline decoration-[#2ECC71] decoration-2 underline-offset-4 hover:text-[#2ECC71] transition-colors break-words"
      {...rest}
    >
      {children}
    </a>
  );
};
const MdStrong = (props) => (
  <strong className="font-semibold text-[#1A1A2E]" {...props} />
);
const MdEm = (props) => (
  <em
    className="not-italic text-[#1A1A2E]/70 text-sm block mb-2"
    {...props}
  />
);
const MdHr = () => <hr className="my-10 border-t border-[#1A5C3A]/15" />;
const MdTable = (props) => (
  <div className="my-6 overflow-x-auto rounded-lg border border-[#1A5C3A]/15">
    <table className="w-full text-sm text-left" {...props} />
  </div>
);
const MdThead = (props) => <thead className="bg-[#E8F5EE]" {...props} />;
const MdTbody = (props) => (
  <tbody className="divide-y divide-[#1A5C3A]/10" {...props} />
);
const MdTr = (props) => <tr className="align-top" {...props} />;
const MdTh = (props) => (
  <th
    className="px-4 py-3 text-[#1A5C3A] font-semibold text-xs uppercase tracking-wide"
    {...props}
  />
);
const MdTd = (props) => (
  <td className="px-4 py-3 text-[#1A1A2E]/90 leading-relaxed" {...props} />
);
const MdCode = ({ inline, children, ...rest }) =>
  inline ? (
    <code
      className="bg-[#E8F5EE] text-[#1A5C3A] px-1.5 py-0.5 rounded text-sm font-mono"
      {...rest}
    >
      {children}
    </code>
  ) : (
    <pre className="bg-[#1A1A2E] text-white text-sm p-4 rounded-lg overflow-x-auto my-4">
      <code {...rest}>{children}</code>
    </pre>
  );
const MdBlockquote = (props) => (
  <blockquote
    className="border-l-4 border-[#2ECC71] bg-[#E8F5EE] pl-4 pr-3 py-3 my-4 italic text-[#1A1A2E]/90"
    {...props}
  />
);
const MdH1Hidden = () => null;

const MARKDOWN_COMPONENTS = {
  h1: MdH1Hidden,
  h2: MdH2,
  h3: MdH3,
  h4: MdH4,
  p: MdP,
  ul: MdUl,
  ol: MdOl,
  li: MdLi,
  a: MdA,
  strong: MdStrong,
  em: MdEm,
  hr: MdHr,
  table: MdTable,
  thead: MdThead,
  tbody: MdTbody,
  tr: MdTr,
  th: MdTh,
  td: MdTd,
  code: MdCode,
  blockquote: MdBlockquote,
};

const REMARK_PLUGINS = [remarkGfm];

export const LegalPage = ({ title, description, content, slug }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slug]);

  const components = useMemo(() => MARKDOWN_COMPONENTS, []);

  return (
    <div className="bg-white" data-testid={`legal-page-${slug}`}>
      <SEO
        title={title}
        description={description}
        path={`/${slug}`}
        noindex={false}
      />

      {/* Header */}
      <header className="bg-[#E8F5EE] border-b border-[#1A5C3A]/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <p className="uppercase tracking-[0.18em] text-xs font-semibold text-[#1A5C3A] mb-3">
            Informations légales
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A5C3A] leading-tight">
            {title}
          </h1>
        </div>
      </header>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="legal-prose text-[#1A1A2E]">
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={components}>
            {content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  );
};

export default LegalPage;
