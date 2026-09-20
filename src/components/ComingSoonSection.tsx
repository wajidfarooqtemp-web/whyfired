interface Props {
  id: string;
  title: string;
  note: string;
}

export default function ComingSoonSection({ id, title, note }: Props) {
  return (
    <section
      id={id}
      className="border-t border-white/10 py-24 px-5 sm:px-8 text-center"
    >
      <div className="max-w-lg mx-auto">
        <h2 className="font-display text-2xl text-cream-50 mb-3">{title}</h2>
        <p className="text-cream-100/60 text-sm leading-relaxed">{note}</p>
      </div>
    </section>
  );
}
