"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard, Zap } from "lucide-react";
import { SubscriptionModal } from "./subscription-modal";
import { useUserCredits } from "@/hooks/use-user-credits";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CreditsDisplayProps {
    variant?: "badge" | "button" | "full";
    showModal?: boolean;
}

export function CreditsDisplay({
    variant = "badge",
    showModal = true,
}: CreditsDisplayProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const { credits, subscription, hasActiveSubscription, isLoading } = useUserCredits();

    const totalCredits = credits?.totalCredits ?? 0;
    const isLow = totalCredits > 0 && totalCredits <= 50;
    const isEmpty = totalCredits === 0;

    const modal = showModal ? (
        <SubscriptionModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            hasActiveSubscription={hasActiveSubscription}
            currentCredits={totalCredits}
            currentPlanId={subscription?.plan_id ?? null}
        />
    ) : null;

    if (variant === "badge") {
        return (
            <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="outline"
                            className={cn(
                                "cursor-pointer text-xs font-medium h-7 px-3 rounded-full gap-1.5 transition-all",
                                "hover:bg-accent",
                                isEmpty && "border-red-500/30 bg-red-500/5 text-red-600 hover:bg-red-500/10 dark:text-red-400",
                                isLow && !isEmpty && "border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
                            )}
                            onClick={() => showModal && setModalOpen(true)}
                        >
                            <Coins className={cn(
                                "size-3",
                                isEmpty ? "text-red-500" : isLow ? "text-amber-500" : "text-muted-foreground"
                            )} />
                            <span className="tabular-nums">{isLoading ? "\u2022\u2022\u2022" : totalCredits}</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {isEmpty ? "No credits — click to get more" : isLow ? "Credits running low" : "View credits & plans"}
                    </TooltipContent>
                </Tooltip>
                {modal}
            </>
        );
    }

    if (variant === "button") {
        return (
            <>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => showModal && setModalOpen(true)}
                            className={cn(
                                "h-8 px-3 rounded-full text-xs font-medium gap-1.5 transition-all",
                                isEmpty
                                    ? "text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400"
                                    : isLow
                                        ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
                                        : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <CreditCard className="size-3.5" />
                            <span className="tabular-nums">{isLoading ? "\u2022\u2022\u2022" : totalCredits}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        {isEmpty ? "No credits — click to get more" : isLow ? "Credits running low" : "View credits & plans"}
                    </TooltipContent>
                </Tooltip>
                {modal}
            </>
        );
    }

    // Full variant
    return (
        <>
            <div
                className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2 transition-colors cursor-pointer hover:bg-muted/50",
                    isEmpty
                        ? "border-red-500/20 bg-red-500/5"
                        : isLow
                            ? "border-amber-500/20 bg-amber-500/5"
                            : "border-border/60 bg-card",
                )}
                onClick={() => showModal && setModalOpen(true)}
            >
                <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    isEmpty ? "bg-red-500/10" : isLow ? "bg-amber-500/10" : "bg-primary/10",
                )}>
                    <Zap className={cn(
                        "size-4",
                        isEmpty ? "text-red-500" : isLow ? "text-amber-500" : "text-primary",
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold tabular-nums">
                        {isLoading ? "\u2022\u2022\u2022" : totalCredits}
                    </span>
                    <span className="ml-1 text-xs text-muted-foreground">credits</span>
                    {isEmpty && <p className="text-[10px] text-red-500 dark:text-red-400">Top up to continue</p>}
                    {isLow && !isEmpty && <p className="text-[10px] text-amber-500 dark:text-amber-400">Running low</p>}
                </div>
                {showModal && (
                    <Button
                        variant={isEmpty || isLow ? "default" : "outline"}
                        size="sm"
                        className="h-7 shrink-0 rounded-lg px-3 text-[11px]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalOpen(true);
                        }}
                    >
                        {hasActiveSubscription ? "Buy More" : "Upgrade"}
                    </Button>
                )}
            </div>
            {modal}
        </>
    );
}
