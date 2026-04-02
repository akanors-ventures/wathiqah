export function IslamicFoundation() {
  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center gap-8 max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[4px] text-primary">Our Foundation</p>

          <blockquote className="text-2xl md:text-3xl font-serif italic text-foreground leading-relaxed">
            "O you who believe — when you contract a debt for a specified term, write it down."
          </blockquote>

          <div className="flex items-center gap-4">
            <div className="w-10 h-px bg-primary/30" />
            <p className="text-xs font-bold uppercase tracking-[2px] text-muted-foreground">
              Surah Al-Baqarah 2:282
            </p>
            <div className="w-10 h-px bg-primary/30" />
          </div>

          <p className="text-base md:text-lg text-muted-foreground leading-relaxed font-medium">
            The longest verse in the Quran dedicates itself entirely to a single instruction:
            document your financial dealings and appoint witnesses. Most tools do the first.
            Wathīqah does both.
          </p>
        </div>
      </div>

      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
    </section>
  );
}
