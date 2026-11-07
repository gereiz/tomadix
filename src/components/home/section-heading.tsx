interface SectionHeadingProps {
  title: string;
  description?: string;
  id?: string;
}

export function SectionHeading({ title, description, id }: SectionHeadingProps) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="font-headline-lg text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-2 text-on-surface-variant">{description}</p>}
    </div>
  );
}
