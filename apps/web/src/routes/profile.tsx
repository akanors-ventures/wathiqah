import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, User, Zap, AlertCircle, ArrowUpCircle, Heart } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { TierBadge } from "@/components/ui/tier-badge";
import { SupporterBadge } from "@/components/ui/supporter-badge";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/profile")({
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const { updateUser, updating } = useProfile();
  const { tier, isPro, witnessUsage, maxWitnessesPerMonth, witnessRemaining } = useSubscription();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const phoneNumberId = useId();

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user]);

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  const witnessPercentage =
    maxWitnessesPerMonth > 0 ? (witnessUsage / maxWitnessesPerMonth) * 100 : 0;
  const isWitnessLimitLow = witnessRemaining <= 1 && !isPro;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser({
        firstName,
        lastName,
        phoneNumber,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4 max-w-4xl space-y-6 sm:space-y-8">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="grid gap-6 sm:gap-8 md:grid-cols-[280px_1fr]">
        {/* Sidebar / User Info Summary */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-2 border-border/50">
            <CardContent className="pt-8 flex flex-col items-center text-center">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-black">
                    {user.firstName?.charAt(0)}
                    {user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1">
                  <TierBadge tier={tier} className="shadow-lg" />
                </div>
                {user.isSupporter && (
                  <div className="absolute -top-1 -right-1">
                    <SupporterBadge className="shadow-lg" />
                  </div>
                )}
              </div>
              <h2 className="text-xl font-black tracking-tight">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 font-medium">{user.email}</p>

              <div className="w-full space-y-4 text-left">
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Witness Limit
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {witnessUsage} / {maxWitnessesPerMonth || "∞"}
                    </span>
                  </div>
                  <Progress
                    value={maxWitnessesPerMonth > 0 ? witnessPercentage : 0}
                    className="h-1.5"
                  />
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {isPro
                      ? "Unlimited requests"
                      : `${witnessRemaining} requests remaining this month`}
                  </p>
                </div>

                {!isPro && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 rounded-md border-primary/20 hover:bg-primary/5 hover:text-primary transition-all group"
                  >
                    <Link to="/pricing">
                      <Zap className="w-4 h-4 mr-2 group-hover:fill-primary transition-all" />
                      Upgrade to Pro
                    </Link>
                  </Button>
                )}

                <Button
                  asChild
                  variant="secondary"
                  className="w-full h-11 rounded-md border-pink-500/20 hover:bg-pink-500/5 hover:text-pink-600 transition-all group"
                >
                  <Link to="/support">
                    <Heart className="w-4 h-4 mr-2 transition-all group-hover:fill-pink-500 text-pink-500" />
                    Support
                  </Link>
                </Button>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6 flex flex-col items-center px-6">
              <p className="text-[10px] text-muted-foreground text-center font-medium leading-relaxed">
                Wathīqah is built with love by Akanors Ventures. Your support helps us keep the
                service running and free for everyone.
              </p>
            </CardFooter>
          </Card>

          {isWitnessLimitLow && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 animate-in slide-in-from-left duration-500">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-tight">
                  Limit Reached Soon
                </p>
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                  You're almost out of witness requests. Upgrade to Pro for unlimited access.
                </p>
                <Link
                  to="/pricing"
                  className="text-[10px] font-black text-amber-800 uppercase tracking-widest hover:underline flex items-center gap-1 mt-1"
                >
                  Upgrade Now <ArrowUpCircle className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your name and contact details.</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor={firstNameId}>First Name</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={firstNameId}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={lastNameId}>Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={lastNameId}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={emailId}>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={emailId}
                      value={user.email}
                      disabled
                      className="pl-9 bg-muted text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your email address is used for login and cannot be changed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={phoneNumberId}>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={phoneNumberId}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 sm:pt-0">
                  <Button type="submit" isLoading={updating} className="w-full sm:w-auto">
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
