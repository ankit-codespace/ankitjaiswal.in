import { Helmet } from "react-helmet-async";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "./ui/button";

interface ToolLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  faqs?: { question: string; answer: string }[];
}

export function ToolLayout({ title, description, children, faqs }: ToolLayoutProps) {
  return (
    <div className="container mx-auto px-4 pt-6 pb-12 max-w-4xl">
      <Helmet>
        <title>{title} | Ankit Jaiswal Tools</title>
        <meta name="description" content={description} />
      </Helmet>

      <Link href="/tools">
        <Button variant="ghost" className="mb-8 pl-0 hover:pl-2 transition-all gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Tools
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-3">{title}</h1>
        <p className="text-lg text-muted-foreground">{description}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm mb-12">
        {children}
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 flex items-start gap-3 mb-12">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm mb-1">Privacy Note</h4>
          <p className="text-sm text-muted-foreground">
            This tool runs entirely locally in your browser. No data is sent to any server.
          </p>
        </div>
      </div>

      {faqs && faqs.length > 0 && (
        <div className="mt-16 border-t border-border pt-12">
          <h2 className="text-2xl font-bold font-display mb-8">Frequently Asked Questions</h2>
          <div className="grid gap-6">
            {faqs.map((faq, i) => (
              <div key={i} className="space-y-2">
                <h3 className="font-semibold text-lg">{faq.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })}
          </script>
        </div>
      )}
    </div>
  );
}
