import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-background text-foreground text-center px-4">
      <div className="mb-8 p-6 bg-destructive/10 rounded-full">
        <AlertCircle className="h-16 w-16 text-destructive" />
      </div>
      <h1 className="text-4xl font-bold font-display tracking-tighter sm:text-5xl mb-4">404 - Page Not Found</h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button size="lg" className="rounded-full px-8">Return Home</Button>
      </Link>
    </div>
  );
}
