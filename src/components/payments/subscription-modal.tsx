"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Globe, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { env } from "@/env";
import {
  type LocalizedPlan,
  type LocalizedCreditPack,
  CREDIT_COSTS,
  getSubscriptionPlanById,
} from "@/config/credits.config";
import { useLocalizedPricing } from "@/hooks/use-localized-pricing";
import { type SupportedCurrency } from "@/config/currency.config";
import {
  useSubscribe,
  useBuyCredits,
  useVerifyPayment,
} from "@/client-api/query-hooks/use-payment-mutations";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SubscriptionModalProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasActiveSubscription?: boolean;
  currentCredits?: number;
  currentPlanId?: string | null;
}

export function SubscriptionModal({
  children,
  open,
  onOpenChange,
  hasActiveSubscription = false,
  currentCredits = 0,
  currentPlanId = null,
}: SubscriptionModalProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: pricingData,
    isLoading: isPricingLoading,
    currency,
    changeCurrency,
    availableCurrencies,
  } = useLocalizedPricing();

  const subscribeMutation = useSubscribe();
  const buyCreditsMutation = useBuyCredits();
  const verifyPaymentMutation = useVerifyPayment();

  const subscriptionPlans = pricingData?.subscriptionPlans ?? [];
  const creditPacks = pricingData?.creditPacks ?? [];

  const isLoading = subscribeMutation.isPending || buyCreditsMutation.isPending;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleCurrencyChange = (value: string) => {
    changeCurrency(value as SupportedCurrency);
  };

  const handlePaymentSuccess = async (response: RazorpayResponse) => {
    setVerifying(true);
    try {
      const result = await verifyPaymentMutation.mutateAsync({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      if (result.success) {
        toast.success(result.message);
        await queryClient.invalidateQueries({ queryKey: ["user-credits"] });
        setTimeout(() => {
          onOpenChange?.(false);
          setVerifying(false);
          setLoadingPlanId(null);
        }, 800);
      } else {
        toast.error("Payment verification failed. Please contact support if your payment was deducted.");
        setVerifying(false);
        setLoadingPlanId(null);
        onOpenChange?.(true);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to verify payment";
      toast.error(errorMessage);
      setVerifying(false);
      setLoadingPlanId(null);
      onOpenChange?.(true);
    }
  };

  const initiatePayment = (
    orderId: string,
    amount: number,
    paymentCurrency: string,
    description: string
  ) => {
    if (!window.Razorpay) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      return;
    }

    const options: RazorpayOptions = {
      key: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency: paymentCurrency,
      name: "Buildify",
      description,
      order_id: orderId,
      handler: (response) => {
        void handlePaymentSuccess(response);
      },
      theme: {
        color: "#6366f1",
      },
      modal: {
        ondismiss: () => {
          setLoadingPlanId(null);
          onOpenChange?.(true);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    onOpenChange?.(false);
    razorpay.open();
  };

  const handleSubscribe = async (plan: LocalizedPlan) => {
    if (!razorpayLoaded) {
      toast.error("Payment system is loading. Please wait.");
      return;
    }

    setLoadingPlanId(plan.id);

    try {
      const data = await subscribeMutation.mutateAsync({
        planId: plan.id,
        displayCurrency: currency,
      });

      initiatePayment(
        data.orderId,
        data.amount,
        data.currency,
        `${plan.name} Plan - ${plan.credits} Credits/month`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create order";
      toast.error(errorMessage);
      setLoadingPlanId(null);
    }
  };

  const handleBuyCredits = async (pack: LocalizedCreditPack) => {
    if (!razorpayLoaded) {
      toast.error("Payment system is loading. Please wait.");
      return;
    }

    setLoadingPlanId(pack.id);

    try {
      const data = await buyCreditsMutation.mutateAsync({
        packId: pack.id,
        displayCurrency: currency,
      });

      initiatePayment(
        data.orderId,
        data.amount,
        data.currency,
        `${pack.credits} Additional Credits`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create order";
      toast.error(errorMessage);
      setLoadingPlanId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[640px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Subscription & Credits
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose a plan or buy additional credits to continue building.
          </DialogDescription>
        </DialogHeader>

        {/* Balance bar */}
        <div className="mx-6 rounded-xl border border-border/50 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">{currentCredits}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">credits available</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <Globe className="size-3 text-muted-foreground/50" />
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[110px] h-7 text-xs rounded-lg border-border/50">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code} className="text-xs">
                      {curr.symbol} {curr.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-right text-[11px] text-muted-foreground/60">
              <p>New chat: {CREDIT_COSTS.NEW_PROMPT} cr</p>
              <p>Follow-up: {CREDIT_COSTS.FOLLOW_UP_PROMPT} cr</p>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue={hasActiveSubscription && currentPlanId !== "free" ? "credits" : "subscription"}
          className="w-full mt-4"
        >
          <div className="border-b border-border/40 px-6">
            <TabsList className="h-9 w-full justify-start bg-transparent p-0 gap-4">
              <TabsTrigger
                value="subscription"
                className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Plans
              </TabsTrigger>
              <TabsTrigger
                value="credits"
                disabled={!hasActiveSubscription || currentPlanId === "free"}
                className="h-9 rounded-none border-b-2 border-transparent px-0 pb-2.5 pt-2 text-xs font-medium data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Buy Credits
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-5 min-h-[280px]">
            <TabsContent value="subscription" className="mt-0">
              {isPricingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-px w-8 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full w-1/2 bg-foreground/20 rounded-full"
                      style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
                    />
                  </div>
                  <style>{`
                    @keyframes shimmer {
                      0%, 100% { transform: translateX(-100%); }
                      50% { transform: translateX(200%); }
                    }
                  `}</style>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptionPlans.map((plan) => {
                    const isPopular = "popular" in plan && (plan as { popular?: boolean }).popular;
                    const isCurrentPlan = currentPlanId === plan.id;
                    const isFreeTier = currentPlanId === "free";
                    const currentPlanConfig = currentPlanId ? getSubscriptionPlanById(currentPlanId) : null;
                    const currentPlanPrice = currentPlanConfig?.price ?? 0;
                    const isHigherPlan = plan.basePrice > currentPlanPrice;
                    const isLowerPlan = hasActiveSubscription && !isFreeTier && !isCurrentPlan && !isHigherPlan;

                    let buttonLabel = "Subscribe";
                    let buttonDisabled = isLoading || verifying;
                    let tooltipText: string | null = null;

                    if (verifying) {
                      buttonLabel = "Verifying...";
                    } else if (isCurrentPlan) {
                      buttonLabel = "Current Plan";
                      buttonDisabled = true;
                      tooltipText = "This is your current active plan.";
                    } else if (isLowerPlan) {
                      buttonLabel = "Current plan is higher";
                      buttonDisabled = true;
                      tooltipText = "Your current plan already includes more credits.";
                    } else if (isFreeTier || (hasActiveSubscription && isHigherPlan)) {
                      buttonLabel = "Upgrade";
                    }

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "rounded-xl border p-4 transition-colors",
                          isCurrentPlan
                            ? "border-foreground/30 bg-muted/40"
                            : isPopular
                              ? "border-foreground/20 bg-muted/30"
                              : "border-border/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium">{plan.name}</h3>
                              {isCurrentPlan && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Active
                                </span>
                              )}
                              {isPopular && !isCurrentPlan && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-foreground text-background">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{plan.description}</p>
                            <div className="flex items-baseline gap-3 mt-2">
                              <span className="text-lg font-bold tabular-nums">{plan.formattedPrice}</span>
                              <span className="text-[11px] text-muted-foreground">/month</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Check className="size-3 text-emerald-500" />
                                {plan.credits} credits/mo
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Check className="size-3 text-emerald-500" />
                                {Math.floor(plan.credits / CREDIT_COSTS.NEW_PROMPT)} new prompts
                              </span>
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Check className="size-3 text-emerald-500" />
                                Buy additional credits
                              </span>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant={isCurrentPlan ? "secondary" : isPopular ? "default" : "outline"}
                                  className="h-8 rounded-lg px-4 text-xs shrink-0"
                                  onClick={() => handleSubscribe(plan)}
                                  disabled={buttonDisabled}
                                >
                                  {(loadingPlanId === plan.id || (verifying && loadingPlanId === plan.id)) && (
                                    <Loader2 className="size-3 animate-spin mr-1.5" />
                                  )}
                                  {buttonLabel}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {tooltipText && (
                              <TooltipContent className="text-xs">
                                {tooltipText}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="credits" className="mt-0">
              {isPricingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-px w-8 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full w-1/2 bg-foreground/20 rounded-full"
                      style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
                    />
                  </div>
                </div>
              ) : !hasActiveSubscription || currentPlanId === "free" ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center">
                    <Zap className="size-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium">Paid Plan Required</h3>
                  <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
                    {currentPlanId === "free"
                      ? "Upgrade to a paid plan to purchase additional credits."
                      : "You need an active subscription to purchase additional credits."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground/60 mb-3">
                    Additional credits never expire and persist after subscription ends.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {creditPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="rounded-xl border border-border/50 p-3.5 flex flex-col"
                      >
                        <p className="text-xs font-medium">{pack.name}</p>
                        <div className="flex items-baseline gap-1 mt-1.5">
                          <span className="text-lg font-bold tabular-nums">{pack.formattedPrice}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {Math.floor(pack.credits / CREDIT_COSTS.NEW_PROMPT)} new prompts
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 rounded-lg text-xs mt-3 w-full"
                          onClick={() => handleBuyCredits(pack)}
                          disabled={isLoading}
                        >
                          {loadingPlanId === pack.id && (
                            <Loader2 className="size-3 animate-spin mr-1.5" />
                          )}
                          Buy
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
