"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, CreditCard } from "lucide-react";
import { SubscriptionModal } from "./subscription-modal";
import { useUserCredits } from "@/hooks/use-user-credits";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";

interface CreditsDisplayProps {
    variant?: "badge" | "button" | "full";
    showModal?: boolean;
}

export function CreditsDisplay({
    variant = "badge",
    showModal = true,
}: CreditsDisplayProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const { credits, hasActiveSubscription, isLoading } = useUserCredits();

    const totalCredits = credits?.totalCredits ?? 0;

    const modal = showModal ? (
        <SubscriptionModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            hasActiveSubscription={hasActiveSubscription}
            currentCredits={totalCredits}
        />
    ) : null;

    if (variant === "badge") {
        return (
            <>
                <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-accent text-xs font-medium h-6 px-2.5 rounded-full"
                    onClick={() => showModal && setModalOpen(true)}
                >
                    <Coins className="size-3 mr-1 text-muted-foreground" />
                    {isLoading ? "\u2022\u2022\u2022" : totalCredits}
                </Badge>
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
                            className="h-8 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
                        >
                            <CreditCard className="size-3.5" />
                            {isLoading ? "\u2022\u2022\u2022" : `${totalCredits}`}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>View subscription &amp; credits</TooltipContent>
                </Tooltip>
                {modal}
            </>
        );
    }

    // Full variant
    return (
        <>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                    <Coins className="size-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium tabular-nums">
                        {isLoading ? "\u2022\u2022\u2022" : totalCredits}
                    </span>
                    <span className="text-muted-foreground text-xs">credits</span>
                </div>
                {showModal && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setModalOpen(true)}
                        className="h-7 px-3 rounded-full text-xs"
                    >
                        {hasActiveSubscription ? "Buy More" : "Subscribe"}
                    </Button>
                )}
            </div>
            {modal}
        </>
    );
}
