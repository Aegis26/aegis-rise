import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { aegisLogo } from "@/lib/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="flex items-center gap-3 text-primary font-display font-bold text-3xl tracking-tight mb-8">
        <img src={aegisLogo} alt="Aegis Rise" className="h-10 w-auto" />
        <span>AEGIS RISE</span>
      </div>
      
      <h1 className="text-6xl font-display font-bold mb-4">404</h1>
      <h2 className="text-2xl font-medium text-muted-foreground mb-8">Page Not Found</h2>
      
      <p className="text-center max-w-md mb-8 text-muted-foreground">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      <Button asChild size="lg" className="gap-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Return to App
        </Link>
      </Button>
    </div>
  );
}
