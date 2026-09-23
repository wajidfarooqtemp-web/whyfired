export default function Contact() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 pt-16">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-7 text-center">
        <h1 className="font-display text-2xl text-cream-50 mb-3">Contact</h1>
        <p className="text-cream-100/60 text-sm mb-5">
          Questions, problems, or anything else; reach out directly.
        </p>
        <a
          href="mailto:support@whyfired.com"
          className="inline-flex items-center rounded-full bg-cream-50 text-brand-900 text-sm font-medium px-5 py-2.5 hover:bg-white transition-colors"
        >
          support@whyfired.com
        </a>
      </div>
    </div>
  );
}
