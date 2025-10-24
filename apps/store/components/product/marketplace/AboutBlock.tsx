"use client";

type AboutBlockProps = {
  title?: string;
  body: string | string[];
};

export function AboutBlock({ title = "ABOUT", body }: AboutBlockProps) {
  const paragraphs = Array.isArray(body) ? body : [body];

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        {paragraphs.map((text, index) => (
          <p key={index} className="max-w-3xl text-[14px] leading-[1.6] text-[#334155]">
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}
