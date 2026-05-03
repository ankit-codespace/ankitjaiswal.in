import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MessageSquare, ArrowRight } from "lucide-react";

export default function Contact() {
  return (
    <div className="container mx-auto px-4 pt-24 pb-12 md:pt-28 md:pb-24 max-w-3xl text-center">
      <Helmet>
        <title>Contact | Ankit Jaiswal</title>
        <meta name="description" content="Get in touch for web development and SEO consulting." />
      </Helmet>

      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-6">Let's Work Together</h1>
        <p className="text-xl text-muted-foreground">
          Ready to elevate your digital presence? Reach out directly.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <a href="mailto:contact@ankitjaiswal.in" className="group">
          <div className="bg-card border border-border p-8 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Email Me</h3>
            <p className="text-muted-foreground mb-6">contact@ankitjaiswal.in</p>
            <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground">
              Send Email <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </a>

        <a 
          href="https://wa.me/917808809043" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group"
        >
          <div className="bg-card border border-border p-8 rounded-2xl shadow-sm hover:shadow-md hover:border-green-500/50 transition-all">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <Phone className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">WhatsApp</h3>
            <p className="text-muted-foreground mb-6">+91 78088 09043</p>
            <Button variant="outline" className="group-hover:bg-green-600 group-hover:text-white group-hover:border-green-600">
              Chat Now <MessageSquare className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </a>
      </div>
    </div>
  );
}
