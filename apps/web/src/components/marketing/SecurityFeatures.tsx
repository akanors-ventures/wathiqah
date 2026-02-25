import { Lock, Server, Users, Eye } from "lucide-react";

const features = [
  {
    icon: <Lock className="w-5 h-5 text-emerald-500" />,
    title: "End-to-End Encryption",
    description: "Your financial data is encrypted at rest and in transit.",
  },
  {
    icon: <Server className="w-5 h-5 text-blue-500" />,
    title: "Daily Backups",
    description: "Redundant backups ensure your ledger is never lost.",
  },
  {
    icon: <Eye className="w-5 h-5 text-primary" />,
    title: "Immutable Audit Logs",
    description: "Every change is recorded permanently for transparency.",
  },
  {
    icon: <Users className="w-5 h-5 text-amber-500" />,
    title: "Privacy First",
    description: "We don't sell your data. Your ledger is yours alone.",
  },
];

export function SecurityFeatures() {
  return (
    <div className="w-full bg-muted/30 border-y border-border/50 py-12 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black tracking-tight text-foreground mb-2">
            Built for <span className="text-emerald-500">Security</span> & Trust
          </h2>
          <p className="text-sm text-muted-foreground font-medium max-w-xl mx-auto">
            We prioritize the safety of your data and the integrity of your relationships.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, _idx) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center p-6 bg-background rounded-2xl border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="mb-4 p-3 bg-muted rounded-full group-hover:bg-primary/5 transition-colors">
                {feature.icon}
              </div>
              <h3 className="font-bold text-sm mb-2 text-foreground">{feature.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
    </div>
  );
}
