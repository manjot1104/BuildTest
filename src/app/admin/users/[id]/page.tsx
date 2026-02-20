"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function UserDetailPage() {
  const params = useParams();
const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [data, setData] = useState<any>(null);
const [openDialog, setOpenDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({
    credits: "",
    durationMonths: "1",
  });

const handleCancelSubscription = async () => {
  if (!id) return;

  try {
    setLoadingCancel(true);

    const res = await fetch("/api/admin/subscription", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });

    if (!res.ok) throw new Error();

    const updated = await fetch(`/api/admin/users/${id}`).then((r) =>
      r.json()
    );

    setData(updated);

    toast("Subscription cancelled successfully");

  } catch {
    toast("Failed to cancel subscription");
  } finally {
    setLoadingCancel(false);
    setOpenDialog(false);
  }
};

const handleAssignSubscription = async () => {
  if (!id) return;

  const credits = parseInt(assignForm.credits);
  const durationMonths = parseInt(assignForm.durationMonths);

  if (isNaN(credits) || credits < 0) {
    toast.error("Please enter a valid number of credits");
    return;
  }

  if (isNaN(durationMonths) || durationMonths < 1) {
    toast.error("Please enter a valid duration (minimum 1 month)");
    return;
  }

  try {
    setLoadingAssign(true);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const res = await fetch("/api/admin/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: id,
        plan_id: "admin",
        plan_name: "Admin Grant",
        plan_price: 0,
        credits_per_month: credits,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to assign subscription");
    }

    const updated = await fetch(`/api/admin/users/${id}`).then((r) =>
      r.json()
    );

    setData(updated);

    toast.success(
      `Subscription assigned successfully! ${credits} credits granted for ${durationMonths} month(s).`
    );

    setAssignForm({ credits: "", durationMonths: "1" });
    setOpenAssignDialog(false);
  } catch (error: any) {
    toast.error(error.message || "Failed to assign subscription");
  } finally {
    setLoadingAssign(false);
  }
};

  useEffect(() => {
  if (!id) return;

  fetch(`/api/admin/users/${id}`)
    .then((res) => res.json())
    .then((res) => setData(res));
}, [id]);


if (!data) return <p className="text-muted-foreground">Loading...</p>;

  return (
  <div className="p-8 space-y-10">
    
    {/* Header */}

<div>
  <h1 className="text-3xl font-semibold tracking-tight mb-6">
    User Details
  </h1>

  <Card>
    <CardContent className="space-y-4 pt-6">

      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="font-medium">{data.user.email}</p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Roles</p>
        <div className="flex gap-2 flex-wrap mt-2">
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

    </CardContent>
  </Card>
</div>
   {/* Credits Section */}
<div>
  <h2 className="text-xl font-semibold mb-4">Credits</h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Subscription Credits
        </p>
        <p className="text-2xl font-semibold mt-2">
          {data.credits?.subscription_credits ?? 0}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Additional Credits
        </p>
        <p className="text-2xl font-semibold mt-2">
          {data.credits?.additional_credits ?? 0}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Total Credits
        </p>
        <p className="text-2xl font-semibold mt-2 text-primary">
          {(data.credits?.subscription_credits ?? 0) +
            (data.credits?.additional_credits ?? 0)}
        </p>
      </CardContent>
    </Card>

  </div>
  <div className="mt-6 flex gap-4">
  <Button
  onClick={() => setOpenAssignDialog(true)}
>
  Assign Subscription
</Button>
  <Button
  variant="destructive"
  onClick={() => setOpenDialog(true)}
>
  Cancel Subscription
</Button>
</div>
</div>
   {/* Chats Section */}
<div>
  <h2 className="text-xl font-semibold mb-4">Chats</h2>

  {data.chats.length === 0 && (
    <p className="text-muted-foreground">
      No chats found
    </p>
  )}

  <div className="space-y-4">
    {data.chats.map((chat: any) => (
      <Card key={chat.id}>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">
            {chat.title || "Untitled Chat"}
          </h3>

          <p className="text-sm text-muted-foreground">
            {chat.prompt}
          </p>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
<Dialog open={openAssignDialog} onOpenChange={setOpenAssignDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Assign Subscription</DialogTitle>
      <DialogDescription>
        Manually assign a subscription to this user. This will cancel any existing subscription and grant the specified credits.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="credits">Credits</Label>
        <Input
          id="credits"
          type="number"
          min="0"
          placeholder="Enter number of credits"
          value={assignForm.credits}
          onChange={(e) =>
            setAssignForm({ ...assignForm, credits: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Number of credits to grant to the user
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration">Duration (Months)</Label>
        <Input
          id="duration"
          type="number"
          min="1"
          placeholder="Enter duration in months"
          value={assignForm.durationMonths}
          onChange={(e) =>
            setAssignForm({ ...assignForm, durationMonths: e.target.value })
          }
        />
        <p className="text-xs text-muted-foreground">
          Subscription duration in months
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setOpenAssignDialog(false)}
        disabled={loadingAssign}
      >
        Cancel
      </Button>
      <Button onClick={handleAssignSubscription} disabled={loadingAssign}>
        {loadingAssign ? "Assigning..." : "Assign Subscription"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog open={openDialog} onOpenChange={setOpenDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Cancel Subscription</DialogTitle>
      <DialogDescription>
        Are you sure you want to cancel this user's subscription?
        This will remove all subscription credits.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpenDialog(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleCancelSubscription}
        disabled={loadingCancel}
      >
        {loadingCancel ? "Cancelling..." : "Confirm"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
  </div>
);

}
