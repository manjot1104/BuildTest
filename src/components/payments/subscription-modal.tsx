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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, CreditCard, Sparkles, Zap, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { env } from "@/env";
import {
  type LocalizedPlan,
  type LocalizedCreditPack,
  CREDIT_COSTS,
} from "@/config/credits.config";
import { useLocalizedPricing } from "@/hooks/use-localized-pricing";
import { type SupportedCurrency } from "@/config/currency.config";
import {
  useSubscribe,
  useBuyCredits,
  useVerifyPayment,
} from "@/client-api/query-hooks/use-payment-mutations";

interface SubscriptionModalProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hasActiveSubscription?: boolean;
  currentCredits?: number;
}

export function SubscriptionModal({
  children,
  open,
  onOpenChange,
  hasActiveSubscription = false,
  currentCredits = 0,
}: SubscriptionModalProps) {
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const {
    data: pricingData,
    isLoading: isPricingLoading,
    currency,
    changeCurrency,
    availableCurrencies,
  } = useLocalizedPricing();

  // Eden-based mutation hooks
  const subscribeMutation = useSubscribe();
  const buyCreditsMutation = useBuyCredits();
  const verifyPaymentMutation = useVerifyPayment();

  const subscriptionPlans = pricingData?.subscriptionPlans ?? [];
  const creditPacks = pricingData?.creditPacks ?? [];

  const isLoading = subscribeMutation.isPending || buyCreditsMutation.isPending;

  // Load Razorpay script
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
    try {
      const result = await verifyPaymentMutation.mutateAsync({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      if (result.success) {
        toast.success(result.message);
        onOpenChange?.(false);
        // Refresh the page to update credits
        window.location.reload();
      } else {
        toast.error("Payment verification failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to verify payment";
      toast.error(errorMessage);
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
      name: "Techo Builder",
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
          // Reopen the subscription modal when Razorpay is dismissed
          onOpenChange?.(true);
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    // Close the subscription modal before opening Razorpay
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
      <DialogContent className="w-[95vw] sm:w-[90vw] sm:max-w-4xl lg:w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription & Credits
          </DialogTitle>
          <DialogDescription>
            Choose a plan or buy additional credits to continue building
          </DialogDescription>
        </DialogHeader>

        {/* Current Credits Display & Currency Selector */}
        <div className="bg-muted/50 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">{currentCredits} Credits</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((curr) => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-left sm:text-right text-sm text-muted-foreground">
              <p>New prompt: {CREDIT_COSTS.NEW_PROMPT} credits</p>
              <p>Follow-up: {CREDIT_COSTS.FOLLOW_UP_PROMPT} credits</p>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue={hasActiveSubscription ? "credits" : "subscription"}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscription">
              <Sparkles className="h-4 w-4 mr-2" />
              Subscription Plans
            </TabsTrigger>
            <TabsTrigger value="credits" disabled={!hasActiveSubscription}>
              <Zap className="h-4 w-4 mr-2" />
              Buy Credits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="mt-4">
            {isPricingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {subscriptionPlans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`relative ${
                      "popular" in plan &&
                      (plan as { popular?: boolean }).popular
                        ? "border-primary shadow-md"
                        : ""
                    }`}
                  >
                    {"popular" in plan &&
                      (plan as { popular?: boolean }).popular && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                          Most Popular
                        </Badge>
                      )}
                    <CardHeader className="pb-4">
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="mb-4">
                        <span className="text-3xl font-bold">
                          {plan.formattedPrice}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {plan.credits} credits/month
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {Math.floor(plan.credits / CREDIT_COSTS.NEW_PROMPT)}{" "}
                          new prompts
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Buy additional credits
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Priority support
                        </li>
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        variant={
                          "popular" in plan &&
                          (plan as { popular?: boolean }).popular
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleSubscribe(plan)}
                        disabled={isLoading || hasActiveSubscription}
                      >
                        {loadingPlanId === plan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {hasActiveSubscription
                          ? "Already Subscribed"
                          : "Subscribe"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {hasActiveSubscription && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                You already have an active subscription. Switch to the Credits
                tab to purchase additional credits.
              </p>
            )}
          </TabsContent>

          <TabsContent value="credits" className="mt-4">
            {isPricingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasActiveSubscription ? (
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Subscription Required</p>
                <p className="text-muted-foreground">
                  You need an active subscription to purchase additional
                  credits.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Additional credits never expire and can be used even after
                  your subscription ends.
                </p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {creditPacks.map((pack) => (
                    <Card key={pack.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{pack.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="mb-2">
                          <span className="text-2xl font-bold">
                            {pack.formattedPrice}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {Math.floor(pack.credits / CREDIT_COSTS.NEW_PROMPT)}{" "}
                          new prompts
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant="outline"
                          size="sm"
                          onClick={() => handleBuyCredits(pack)}
                          disabled={isLoading}
                        >
                          {loadingPlanId === pack.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Buy
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
