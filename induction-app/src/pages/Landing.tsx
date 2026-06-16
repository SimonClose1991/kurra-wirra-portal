import { SignInButton, SignUpButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Shield, BookOpen, Leaf, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col min-h-[100dvh]">
      <header className="px-6 h-16 flex items-center justify-between border-b bg-background">
        <div className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/kw-logo.jpg`} alt="Kurra-Wirra Logo" className="h-12 w-auto max-w-[160px] object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <SignInButton mode="modal">
            <Button variant="ghost" data-testid="button-nav-signin">Sign In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button data-testid="button-nav-signup">Sign Up</Button>
          </SignUpButton>
        </div>
      </header>
      
      <main className="flex-1">
        <section className="w-full py-20 md:py-32 bg-primary/5 relative overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl leading-tight">
                Measured to Perform. Trained to Operate.
              </h1>
              <p className="text-xl md:text-2xl font-semibold text-primary">
                Welcome to the Kurra-Wirra Staff Portal.
              </p>
              <p className="mx-auto max-w-[680px] text-lg md:text-xl text-muted-foreground leading-relaxed">
                Complete inductions, read Standard Operating Procedures, and sign off digitally — all in one place to help keep our people safe and our systems consistent.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
                <SignUpButton mode="modal">
                  <Button size="lg" className="h-12 px-8 text-base shadow-sm" data-testid="button-hero-signup">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-background/80 backdrop-blur-sm" data-testid="button-hero-signin">
                    Sign In
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 bg-background border-t">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-card shadow-sm border">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Clear Procedures</h3>
                <p className="text-muted-foreground">Access all standard operating procedures and farm policies organized by logical categories.</p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-card shadow-sm border">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Compliance Tracked</h3>
                <p className="text-muted-foreground">Read and digitally sign each document. Keep a permanent record of your induction progress.</p>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl bg-card shadow-sm border sm:col-span-2 lg:col-span-1">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Leaf className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Safe Workspace</h3>
                <p className="text-muted-foreground">Ensure everyone is on the same page regarding workplace safety, procedures, and expectations.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="w-full border-t py-6 bg-background">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-6 mx-auto text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Kurra-Wirra Staff Portal. All rights reserved.</p>
          <p>Powered by Replit</p>
        </div>
      </footer>
    </div>
  );
}
