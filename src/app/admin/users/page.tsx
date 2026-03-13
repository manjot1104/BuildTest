"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Search,
  Eye,
  Coins,
  CreditCard,
  Plus,
  XCircle,
  MessageSquare,
  ShieldCheck,
  Globe,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Shield,
  ShieldOff,
} from "lucide-react";
import {
  useAdminUsers,
  useAdminUserDetail,
  type AdminUserChat,
} from "@/client-api/query-hooks/use-admin-queries";
import {
  useAssignSubscription,
  useCancelUserSubscription,
  useAddCredits,
  useToggleUserRole,
} from "@/client-api/query-hooks/use-admin-mutations";
import { SUBSCRIPTION_PLANS } from "@/config/credits.config";

// ============================================================================
// Chat Preview Components (adapted from community-builds-grid)
// ============================================================================

const IFRAME_WIDTH = 1280;
const IFRAME_HEIGHT = 720;

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function DemoThumbnail({
  demoUrl,
  title,
}: {
  demoUrl: string;
  title?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / IFRAME_WIDTH);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (iframeError) {
    return (
      <div
        ref={containerRef}
        className="flex size-full items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5"
      >
        <Globe className="size-8 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative size-full">
      {!iframeLoaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/40" />
      )}
      {scale > 0 && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: `${IFRAME_WIDTH}px`,
            height: `${IFRAME_HEIGHT}px`,
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            src={demoUrl}
            title={title ?? "Chat preview"}
            className="size-full border-0"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setIframeError(true)}
          />
        </div>
      )}
    </div>
  );
}

function ChatCard({
  chat,
  onSelect,
}: {
  chat: AdminUserChat;
  onSelect: (chat: AdminUserChat) => void;
}) {
  return (
    <div
      onClick={() => onSelect(chat)}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-xl border border-border/50 bg-card",
        "transition-all duration-200 hover:border-border hover:shadow-md",
      )}
    >
      <div className="pointer-events-none relative aspect-video overflow-hidden bg-muted/30">
        {chat.demo_url ? (
          <DemoThumbnail demoUrl={chat.demo_url} title={chat.title} />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <Globe className="size-8 text-muted-foreground/30" />
          </div>
        )}

        {chat.demo_url && (
          <div
            className={cn(
              "pointer-events-auto absolute right-2 top-2 z-10 rounded-lg p-1.5",
              "bg-black/60 text-white backdrop-blur-sm",
              "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
            )}
          >
            <ExternalLink className="size-3.5" />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="truncate text-sm font-medium text-foreground">
          {chat.title ?? "Untitled Chat"}
        </h3>
        {chat.prompt && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {chat.prompt}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground/50">
          {formatRelativeTime(chat.created_at)}
        </p>
      </div>
    </div>
  );
}

function ChatPreviewDialog({
  chat,
  open,
  onOpenChange,
}: {
  chat: AdminUserChat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (open) setIframeLoading(true);
  }, [open, chat?.v0_chat_id]);

  if (!chat) return null;

  const title = chat.title ?? "Untitled Chat";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle className="truncate pr-8">{title}</DialogTitle>
          {chat.prompt && (
            <DialogDescription className="line-clamp-1">
              {chat.prompt}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="relative aspect-video w-full border-b border-t border-border/50 bg-muted/30">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  Loading preview...
                </p>
              </div>
            </div>
          )}
          {chat.demo_url ? (
            <iframe
              src={chat.demo_url}
              title={title}
              className="size-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              onLoad={() => setIframeLoading(false)}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Globe className="size-8 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(chat.created_at)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.open(
                  `/apps/${chat.v0_chat_id}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                "border border-border/50 bg-muted/50 hover:border-border hover:bg-muted",
                "text-muted-foreground hover:text-foreground",
                "transition-colors duration-150",
              )}
            >
              <Eye className="size-3.5" />
              Visit
            </button>
            <button
              onClick={() => {
                onOpenChange(false);
                router.push(`/chat?chatId=${chat.v0_chat_id}`);
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "transition-colors duration-150",
              )}
            >
              <MessageSquare className="size-3.5" />
              Chat
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// User Detail Dialog
// ============================================================================

function UserDetailDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useAdminUserDetail(open ? userId : undefined);
  const assignMutation = useAssignSubscription();
  const cancelMutation = useCancelUserSubscription();
  const addCreditsMutation = useAddCredits();
  const toggleRoleMutation = useToggleUserRole();

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showAddCreditsForm, setShowAddCreditsForm] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // Chat preview
  const [selectedChat, setSelectedChat] = useState<AdminUserChat | null>(null);
  const [chatPreviewOpen, setChatPreviewOpen] = useState(false);

  // Assign subscription form
  const [selectedPlan, setSelectedPlan] = useState("custom");
  const [assignCredits, setAssignCredits] = useState("");
  const [assignDuration, setAssignDuration] = useState("1");

  // Add credits form
  const [additionalCredits, setAdditionalCredits] = useState("");

  const resetForms = () => {
    setShowAssignForm(false);
    setShowAddCreditsForm(false);
    setConfirmCancel(false);
    setShowChatHistory(false);
    setSelectedPlan("custom");
    setAssignCredits("");
    setAssignDuration("1");
    setAdditionalCredits("");
    setSelectedChat(null);
    setChatPreviewOpen(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForms();
    onOpenChange(value);
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    if (planId !== "custom") {
      const plan = Object.values(SUBSCRIPTION_PLANS).find(
        (p) => p.id === planId,
      );
      if (plan) {
        setAssignCredits(String(plan.credits));
      }
    } else {
      setAssignCredits("");
    }
  };

  const handleAssignSubscription = async () => {
    const credits = parseInt(assignCredits);
    const duration = parseInt(assignDuration);

    if (isNaN(credits) || credits < 1) {
      toast.error("Credits must be at least 1");
      return;
    }
    if (credits > 100000) {
      toast.error("Credits cannot exceed 100,000");
      return;
    }
    if (isNaN(duration) || duration < 1 || duration > 24) {
      toast.error("Duration must be between 1 and 24 months");
      return;
    }

    const plan =
      selectedPlan !== "custom"
        ? Object.values(SUBSCRIPTION_PLANS).find(
            (p) => p.id === selectedPlan,
          )
        : null;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);

    try {
      await assignMutation.mutateAsync({
        userId,
        plan_id: plan?.id ?? "admin",
        plan_name: plan?.name ?? "Admin Grant",
        plan_price: plan?.price ?? 0,
        credits_per_month: credits,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      toast.success(
        `Subscription assigned: ${credits} credits for ${duration} month(s)`,
      );
      resetForms();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign subscription",
      );
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelMutation.mutateAsync({ userId });
      toast.success("Subscription cancelled");
      setConfirmCancel(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel",
      );
    }
  };

  const handleAddCredits = async () => {
    const amount = parseInt(additionalCredits);
    if (isNaN(amount) || amount < 1) {
      toast.error("Enter a valid credit amount");
      return;
    }
    if (amount > 100000) {
      toast.error("Cannot exceed 100,000 credits");
      return;
    }

    try {
      await addCreditsMutation.mutateAsync({
        userId,
        additionalCredits: amount,
      });
      toast.success(`${amount} additional credits added`);
      setAdditionalCredits("");
      setShowAddCreditsForm(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add credits",
      );
    }
  };

  const handleChatSelect = useCallback((chat: AdminUserChat) => {
    setSelectedChat(chat);
    setChatPreviewOpen(true);
  }, []);

  const handleToggleAdmin = async () => {
    if (!data) return;
    const isAdmin = data.user.roles.includes("admin");
    try {
      await toggleRoleMutation.mutateAsync({
        userId,
        role: "admin",
        action: isAdmin ? "remove" : "add",
      });
      toast.success(
        isAdmin ? "Admin role removed" : "Admin role granted",
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update role",
      );
    }
  };

  const subCredits = data?.credits?.subscription_credits ?? 0;
  const addCreds = data?.credits?.additional_credits ?? 0;
  const hasSubscription = !!data?.subscription;

  // Chat history view
  if (showChatHistory && data) {
    return (
      <>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
            <DialogHeader className="shrink-0">
              <div className="flex items-center gap-3 pr-8">
                <button
                  onClick={() => setShowChatHistory(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <DialogTitle className="text-lg">
                    Chat History
                  </DialogTitle>
                  <DialogDescription>
                    {data.user.name || data.user.email} &middot;{" "}
                    {data.chats.length} chat
                    {data.chats.length !== 1 ? "s" : ""}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {data.chats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="size-8 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No chats yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.chats.map((chat) => (
                    <ChatCard
                      key={chat.id}
                      chat={chat}
                      onSelect={handleChatSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <ChatPreviewDialog
          chat={selectedChat}
          open={chatPreviewOpen}
          onOpenChange={setChatPreviewOpen}
        />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        {isLoading || !data ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Separator />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="shrink-0">
              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <DialogTitle className="text-lg">
                    {data.user.name || "Unnamed User"}
                  </DialogTitle>
                  <DialogDescription>{data.user.email}</DialogDescription>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {data.user.roles.map((role: string) => (
                    <Badge
                      key={role}
                      variant={role === "admin" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
              {/* Subscription status */}
              {hasSubscription ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-muted p-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {data.subscription!.plan_name}
                      </p>
                      {data.subscription!.current_period_end && (
                        <p className="text-xs text-muted-foreground">
                          Expires{" "}
                          {new Date(
                            data.subscription!.current_period_end,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="default"
                    className="bg-green-600 hover:bg-green-600"
                  >
                    Active
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                  <XCircle className="size-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No active subscription
                  </p>
                </div>
              )}

              {/* Credits grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CreditCard className="size-3" />
                    Subscription
                  </div>
                  <p className="mt-1 text-xl font-semibold">{subCredits}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Plus className="size-3" />
                    Additional
                  </div>
                  <p className="mt-1 text-xl font-semibold">{addCreds}</p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-muted p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Coins className="size-3" />
                    Total
                  </div>
                  <p className="mt-1 text-xl font-semibold text-primary">
                    {subCredits + addCreds}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={showAssignForm ? "secondary" : "default"}
                  onClick={() => {
                    setShowAssignForm(!showAssignForm);
                    setShowAddCreditsForm(false);
                    setConfirmCancel(false);
                  }}
                >
                  <CreditCard className="mr-1.5 size-3.5" />
                  Assign Subscription
                </Button>
                <Button
                  size="sm"
                  variant={showAddCreditsForm ? "secondary" : "outline"}
                  onClick={() => {
                    setShowAddCreditsForm(!showAddCreditsForm);
                    setShowAssignForm(false);
                    setConfirmCancel(false);
                  }}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add Credits
                </Button>
                {hasSubscription && (
                  <Button
                    size="sm"
                    variant={confirmCancel ? "secondary" : "destructive"}
                    onClick={() => {
                      setConfirmCancel(!confirmCancel);
                      setShowAssignForm(false);
                      setShowAddCreditsForm(false);
                    }}
                  >
                    <XCircle className="mr-1.5 size-3.5" />
                    Cancel Subscription
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={data.user.roles.includes("admin") ? "destructive" : "outline"}
                  onClick={handleToggleAdmin}
                  disabled={toggleRoleMutation.isPending}
                >
                  {data.user.roles.includes("admin") ? (
                    <>
                      <ShieldOff className="mr-1.5 size-3.5" />
                      {toggleRoleMutation.isPending ? "Removing..." : "Remove Admin"}
                    </>
                  ) : (
                    <>
                      <Shield className="mr-1.5 size-3.5" />
                      {toggleRoleMutation.isPending ? "Granting..." : "Make Admin"}
                    </>
                  )}
                </Button>
              </div>

              {/* Assign subscription form */}
              {showAssignForm && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Assign Subscription</p>
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select
                      value={selectedPlan}
                      onValueChange={handlePlanSelect}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                            {plan.credits > 0 && ` (${plan.credits} credits)`}
                            {plan.price > 0 && ` - ₹${plan.price}`}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Credits</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100000"
                        placeholder="e.g. 500"
                        value={assignCredits}
                        onChange={(e) => setAssignCredits(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (months)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        placeholder="e.g. 1"
                        value={assignDuration}
                        onChange={(e) => setAssignDuration(e.target.value)}
                      />
                    </div>
                  </div>
                  {hasSubscription && (
                    <p className="text-xs text-destructive">
                      This will replace the current active subscription.
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAssignForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAssignSubscription}
                      disabled={assignMutation.isPending}
                    >
                      {assignMutation.isPending ? "Assigning..." : "Assign"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Add credits form */}
              {showAddCreditsForm && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Add Additional Credits</p>
                  <p className="text-xs text-muted-foreground">
                    Additional credits never expire and are preserved even if
                    the subscription is cancelled.
                  </p>
                  <div className="space-y-2">
                    <Label>Credits to Add</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100000"
                      placeholder="e.g. 100"
                      value={additionalCredits}
                      onChange={(e) => setAdditionalCredits(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddCreditsForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddCredits}
                      disabled={addCreditsMutation.isPending}
                    >
                      {addCreditsMutation.isPending
                        ? "Adding..."
                        : "Add Credits"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancel confirmation */}
              {confirmCancel && (
                <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Confirm Cancellation
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will cancel the subscription and remove all{" "}
                    <span className="font-medium text-foreground">
                      {subCredits}
                    </span>{" "}
                    subscription credits. Additional credits ({addCreds}) will be
                    preserved.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmCancel(false)}
                    >
                      Keep Subscription
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleCancelSubscription}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending
                        ? "Cancelling..."
                        : "Confirm Cancel"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Chats section */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Chats ({data.chats.length})
                    </p>
                  </div>
                  {data.chats.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowChatHistory(true)}
                    >
                      <Eye className="mr-1.5 size-3.5" />
                      View All
                    </Button>
                  )}
                </div>
                {data.chats.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No chats yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {data.chats.slice(0, 6).map((chat) => (
                      <ChatCard
                        key={chat.id}
                        chat={chat}
                        onSelect={handleChatSelect}
                      />
                    ))}
                  </div>
                )}
                {data.chats.length > 6 && !showChatHistory && (
                  <button
                    onClick={() => setShowChatHistory(true)}
                    className="w-full rounded-lg border border-border/50 py-2 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  >
                    View all {data.chats.length} chats
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Users Page
// ============================================================================

export default function UsersPage() {
  const { data: users = [], isLoading, error } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading..."
              : `${users.length} registered user${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="shrink-0 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error.message}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden lg:table-cell">User ID</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {search ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            )}

            {filtered.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer transition-colors hover:bg-muted/40"
                onClick={() => setSelectedUserId(u.id)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{u.name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles?.map((role: string) => (
                      <Badge
                        key={role}
                        variant={role === "admin" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">
                  {u.id}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUserId(u.id);
                    }}
                  >
                    <Eye className="mr-1.5 size-3.5" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedUserId && (
        <UserDetailDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => {
            if (!open) setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
}
