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

  if (variant === "badge") {
    return (
      <>
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent"
          onClick={() => showModal && setModalOpen(true)}
        >
          <Coins className="h-3 w-3 mr-1" />
          {isLoading ? "..." : totalCredits}
        </Badge>
        {showModal && (
          <SubscriptionModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            hasActiveSubscription={hasActiveSubscription}
            currentCredits={totalCredits}
          />
        )}
      </>
    );
  }

  if (variant === "button") {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => showModal && setModalOpen(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isLoading ? "..." : `${totalCredits} Credits`}
            </Button>
          </TooltipTrigger>
          <TooltipContent>View subscription &amp; credits</TooltipContent>
        </Tooltip>
        {showModal && (
          <SubscriptionModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            hasActiveSubscription={hasActiveSubscription}
            currentCredits={totalCredits}
          />
        )}
      </>
    );
  }

  // Full variant
  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {isLoading ? "..." : totalCredits}
          </span>
          <span className="text-muted-foreground text-sm">credits</span>
        </div>
        {showModal && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            {hasActiveSubscription ? "Buy More" : "Subscribe"}
          </Button>
        )}
      </div>
      {showModal && (
        <SubscriptionModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          hasActiveSubscription={hasActiveSubscription}
          currentCredits={totalCredits}
        />
      )}
    </>
  );
}
