import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

export function TrustSignals() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/80 border-primary/20 bg-primary/5"
          >
            Why Wathīqah?
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-6 leading-none">
            Built on <span className="text-primary">Integrity</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
            We don't need to fake trust. Wathīqah is designed to solve real problems for real
            people, built by a team that values transparency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Card 1: The Problem */}
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-500 hover:-translate-y-1 group">
            <CardContent className="p-8 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                <Quote className="w-6 h-6 rotate-180" />
              </div>
              <h3 className="text-xl font-bold text-foreground">The "Memory" Problem</h3>
              <p className="text-muted-foreground leading-relaxed">
                "I thought I paid you back last week?" <br />
                <br />
                Memory is fallible. Relationships shouldn't suffer because of forgotten details. We
                built Wathīqah to eliminate ambiguity.
              </p>
            </CardContent>
          </Card>

          {/* Card 2: The Solution */}
          <Card className="border-none shadow-xl bg-primary/5 backdrop-blur-sm hover:bg-primary/10 transition-all duration-500 hover:-translate-y-1 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
            <CardContent className="p-8 space-y-6 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Quote className="w-6 h-6 rotate-180" />
              </div>
              <h3 className="text-xl font-bold text-primary">The "Witness" Solution</h3>
              <p className="text-foreground/80 leading-relaxed font-medium">
                By adding a neutral third party to verify transactions, we create a layer of social
                accountability that spreadsheets can't match.
              </p>
            </CardContent>
          </Card>

          {/* Card 3: The Promise */}
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm hover:bg-card transition-all duration-500 hover:-translate-y-1 group">
            <CardContent className="p-8 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Quote className="w-6 h-6 rotate-180" />
              </div>
              <h3 className="text-xl font-bold text-foreground">The Akanors Promise</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built by <strong>Akanors Ventures</strong>. We are committed to privacy, security,
                and building tools that enhance human connection, not replace it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
