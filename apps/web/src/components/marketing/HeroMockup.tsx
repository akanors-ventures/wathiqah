import { ArrowUpRight, Clock, DollarSign, Mail, ShieldCheck, User } from "lucide-react";

export function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none perspective-1000 h-[400px] lg:h-[500px] flex items-center justify-center lg:justify-end">
      {/* Main Dashboard Card - Tilted */}
      <div
        className="relative z-20 bg-card rounded-[24px] border border-border/50 shadow-2xl overflow-hidden transform transition-all duration-700 hover:scale-[1.02] hover:-rotate-1 w-[320px] sm:w-[380px] lg:w-[420px] -rotate-y-12 rotate-x-6 translate-x-4"
        style={{
          boxShadow:
            "20px 30px 40px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header Mockup */}
        <div className="flex items-center justify-between p-4 border-b border-border/10 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="h-2 w-20 bg-foreground/10 rounded-full"></div>
              <div className="h-1.5 w-12 bg-foreground/5 rounded-full"></div>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full border border-border/20"></div>
        </div>

        {/* Content Mockup */}
        <div className="p-6 space-y-6 bg-card/95 backdrop-blur-sm">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
              <div className="flex items-center gap-2 text-primary/60 text-xs font-bold uppercase tracking-wider">
                <DollarSign className="w-3 h-3" />
                Net Balance
              </div>
              <div className="text-2xl font-black text-primary">+ ₦450,000</div>
            </div>
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/10 space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                Pending
              </div>
              <div className="text-2xl font-black text-foreground">2 Actions</div>
            </div>
          </div>

          {/* Recent Activity List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-70">
              Recent Activity
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/20"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      i === 1 ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="h-2.5 w-24 bg-foreground/10 rounded-full mb-1.5"></div>
                    <div className="h-2 w-16 bg-foreground/5 rounded-full"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-2.5 w-16 bg-foreground/10 rounded-full mb-1.5 ml-auto"></div>
                  <div className="h-2 w-8 bg-foreground/5 rounded-full ml-auto"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Witness Email Card - Overlapping Left */}
      <div className="absolute left-0 lg:-left-12 bottom-12 lg:bottom-24 z-30 w-[280px] sm:w-[320px] bg-card rounded-2xl border border-border/50 shadow-2xl p-0 overflow-hidden animate-in slide-in-from-left-12 fade-in duration-1000 delay-300 transform rotate-2 hover:rotate-0 transition-transform">
        <div className="bg-primary/5 p-3 border-b border-primary/10 flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary">New Witness Request</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Fawaz sent a request</p>
              <p className="text-xs text-muted-foreground">wants you to verify a loan</p>
            </div>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg border border-border/20 text-xs text-muted-foreground">
            "Hey, can you witness this loan of ₦50,000 to Ali? Thanks!"
          </div>

          <div className="flex gap-2">
            <div className="h-8 flex-1 bg-primary rounded-md flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20">
              Verify
            </div>
            <div className="h-8 w-20 bg-muted rounded-md flex items-center justify-center text-xs font-medium text-muted-foreground">
              Decline
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification - Floating Right */}
      <div className="absolute -right-4 lg:-right-8 top-12 lg:top-24 z-10 w-64 bg-card rounded-2xl border border-emerald-500/20 shadow-xl p-4 animate-in slide-in-from-right-8 fade-in duration-1000 delay-700 hidden sm:block transform -rotate-2 hover:rotate-0 transition-transform">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-foreground">Transaction Verified</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Witness acknowledged the record. It is now immutable.
            </p>
          </div>
        </div>
      </div>

      {/* Background Decorative Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-to-tr from-primary/10 via-blue-500/10 to-emerald-500/10 rounded-full blur-[80px] -z-10 opacity-60 animate-pulse duration-[8s]"></div>
    </div>
  );
}
