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
<<<<<<< HEAD
          <p key={index} className="max-w-3xl text-[18px] leading-[1.6] text-[#334155]">
=======
          <p key={index} className="max-w-3xl text-[14px] leading-[1.6] text-[#334155]">
>>>>>>> origin/staging
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}
