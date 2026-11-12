export function Manual({
  title,
  lede,
  sections,
}: {
  title: string;
  lede: string;
  sections: { heading: string; paragraphs: string[] }[];
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-bold tracking-wide text-gold uppercase">Manual</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-ink-soft">{lede}</p>
      <div className="mt-10 grid gap-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="font-serif text-2xl">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
