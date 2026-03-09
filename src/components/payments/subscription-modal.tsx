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

  const isLowCredits = currentCredits > 0 && currentCredits <= 50;
  const isEmptyCredits = currentCredits === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="hk-neon-dialog sm:max-w-[680px] p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto rounded-none" showCloseButton={false}>
        {/* Header */}
        <div className="hk-neon-dialog-header relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <DialogHeader>
            <DialogTitle className="hk-neon-dialog-title text-lg font-bold tracking-tight sm:text-xl">
              Credits & Plans
            </DialogTitle>
            <DialogDescription className="font-mono text-[11px] text-muted-foreground">
              // manage your subscription and credits
            </DialogDescription>
          </DialogHeader>

          {/* Balance card */}
          <div className={cn(
            "hk-neon-card mt-4 flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between",
            isEmptyCredits
              ? "border-red-500/20 bg-red-500/5"
              : isLowCredits
                ? "border-amber-500/20 bg-amber-500/5"
                : "",
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "hk-neon-empty-icon flex size-10 shrink-0 items-center justify-center sm:size-12",
                isEmptyCredits
                  ? "bg-red-500/10"
                  : isLowCredits
                    ? "bg-amber-500/10"
                    : "bg-primary/10",
              )}>
                <Zap className={cn(
                  "size-5 sm:size-6",
                  isEmptyCredits ? "text-red-500" : isLowCredits ? "text-amber-500" : "text-primary",
                )} />
              </div>
              <div>
                <p className="hk-neon-label">Balance</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="hk-neon-stat text-2xl font-bold tabular-nums sm:text-3xl">{currentCredits}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">credits</p>
                </div>
                {isEmptyCredits && (
                  <p className="font-mono text-[10px] font-medium text-red-500 dark:text-red-400">// no credits remaining</p>
                )}
                {isLowCredits && !isEmptyCredits && (
                  <p className="font-mono text-[10px] font-medium text-amber-500 dark:text-amber-400">// running low</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
              <div className="flex items-center gap-1.5">
                <Globe className="size-3 text-muted-foreground/50" />
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="hk-neon-select w-[100px] h-7 text-xs sm:w-[110px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent className="hk-neon-dropdown">
                    {availableCurrencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code} className="hk-neon-dropdown-item font-mono text-xs">
                        {curr.symbol} {curr.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 font-mono text-[10px] text-muted-foreground/60 sm:flex-col sm:gap-0 sm:text-right">
                <p>new_chat: <span className="hk-neon-stat font-medium">{CREDIT_COSTS.NEW_PROMPT}</span> cr</p>
                <p>follow_up: <span className="hk-neon-stat font-medium">{CREDIT_COSTS.FOLLOW_UP_PROMPT}</span> cr</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue={hasActiveSubscription && currentPlanId !== "free" ? "credits" : "subscription"}
          className="w-full"
        >
          <div className="hk-neon-divider" />
          <div className="px-5 sm:px-6">
            <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-1">
              <TabsTrigger
                value="subscription"
                className="hk-neon-tab h-10 rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Plans
              </TabsTrigger>
              <TabsTrigger
                value="credits"
                disabled={!hasActiveSubscription || currentPlanId === "free"}
                className="hk-neon-tab h-10 rounded-none border-b-2 border-transparent px-3 pb-2.5 pt-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Buy Credits
                {(!hasActiveSubscription || currentPlanId === "free") && (
                  <span className="hk-neon-status-active ml-1.5 px-1 py-0.5">PRO</span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="hk-neon-divider" />

          <div className="px-5 py-5 min-h-[280px] sm:px-6">
            <TabsContent value="subscription" className="mt-0">
              {isPricingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
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
                      buttonLabel = "Current";
                      buttonDisabled = true;
                      tooltipText = "This is your current active plan.";
                    } else if (isLowerPlan) {
                      buttonLabel = "Downgrade";
                      buttonDisabled = true;
                      tooltipText = "Your current plan already includes more credits.";
                    } else if (isFreeTier || (hasActiveSubscription && isHigherPlan)) {
                      buttonLabel = "Upgrade";
                    }

                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "hk-neon-card group relative border p-4 transition-all",
                          isCurrentPlan
                            ? "border-primary/30 bg-primary/[0.03]"
                            : isPopular
                              ? "border-foreground/15 bg-muted/20"
                              : ""
                        )}
                      >
                        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-mono text-sm font-semibold">{plan.name}</h3>
                              {isCurrentPlan && (
                                <span className="hk-neon-status-active inline-flex items-center gap-1 px-2 py-0.5">
                                  <Check className="size-2.5" />
                                  Active
                                </span>
                              )}
                              {isPopular && !isCurrentPlan && (
                                <span className="hk-neon-status-active px-2 py-0.5">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground leading-relaxed">{plan.description}</p>
                            <div className="mt-2 flex items-baseline gap-1">
                              <span className="hk-neon-stat text-xl font-bold tabular-nums">{plan.formattedPrice}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">/month</span>
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
                              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                                <span className="hk-neon-empty-icon flex size-4 items-center justify-center bg-emerald-500/10">
                                  <Check className="size-2.5 text-emerald-500" />
                                </span>
                                {plan.credits} credits/mo
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                                <span className="hk-neon-empty-icon flex size-4 items-center justify-center bg-emerald-500/10">
                                  <Check className="size-2.5 text-emerald-500" />
                                </span>
                                {Math.floor(plan.credits / CREDIT_COSTS.NEW_PROMPT)} new chats
                              </span>
                              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                                <span className="hk-neon-empty-icon flex size-4 items-center justify-center bg-emerald-500/10">
                                  <Check className="size-2.5 text-emerald-500" />
                                </span>
                                buy extra credits
                              </span>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="shrink-0">
                                <Button
                                  size="sm"
                                  variant={isCurrentPlan ? "secondary" : isPopular ? "default" : "outline"}
                                  className={cn(
                                    isPopular ? "hk-neon-btn-primary" : "hk-neon-btn",
                                    "h-8 w-full px-5 sm:w-auto",
                                    isCurrentPlan && "pointer-events-none opacity-60",
                                  )}
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
                              <TooltipContent className="font-mono text-xs max-w-[200px]">
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
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : !hasActiveSubscription || currentPlanId === "free" ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="hk-neon-empty-icon size-12 flex items-center justify-center bg-muted/50">
                    <Zap className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-mono text-sm font-semibold">Paid Plan Required</h3>
                  <p className="font-mono text-[10px] text-muted-foreground text-center max-w-xs leading-relaxed">
                    {currentPlanId === "free"
                      ? "// upgrade to a paid plan to purchase additional credits"
                      : "// you need an active subscription to purchase additional credits"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="hk-neon-card flex items-center gap-2 border px-3 py-2">
                    <div className="size-1.5 bg-emerald-500 shadow-[0_0_4px] shadow-emerald-500" />
                    <p className="font-mono text-[10px] text-muted-foreground">
                      additional credits <span className="hk-neon-stat font-medium">never expire</span> and persist after subscription ends
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                    {creditPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className="hk-neon-card group relative flex flex-col border bg-card p-4 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-mono text-sm font-semibold">{pack.name}</p>
                          <span className="hk-neon-status-active px-1.5 py-0.5">
                            {pack.credits} cr
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="hk-neon-stat text-xl font-bold tabular-nums">{pack.formattedPrice}</span>
                        </div>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          ~{Math.floor(pack.credits / CREDIT_COSTS.NEW_PROMPT)} new chats
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="hk-neon-btn mt-3 h-8 w-full"
                          onClick={() => handleBuyCredits(pack)}
                          disabled={isLoading}
                        >
                          {loadingPlanId === pack.id && (
                            <Loader2 className="size-3 animate-spin mr-1.5" />
                          )}
                          Purchase
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
