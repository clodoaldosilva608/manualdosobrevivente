import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Backpack, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listGear, saveGear, deleteGear, type LocalGearItem } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Bug-Out Bag — TacticalGIS" },
      {
        name: "description",
        content:
          "Track gear, weight, and expirations for your bug-out bag and survival loadout.",
      },
    ],
  }),
  component: Inventory,
});

const CATEGORIES = ["tools", "nutrition", "hydration", "medical", "warmth", "shelter"];

function Inventory() {
  const [items, setItems] = useState<LocalGearItem[]>([]);
  const [threshold, setThreshold] = useState(12000); // grams
  const [draft, setDraft] = useState<Partial<LocalGearItem>>({
    category: "tools",
    quantity: 1,
    weight_g: 100,
    packed: false,
  });

  useEffect(() => {
    listGear().then(setItems);
  }, []);

  const totalG = useMemo(
    () => items.filter((i) => i.packed).reduce((s, i) => s + i.weight_g * i.quantity, 0),
    [items],
  );
  const exceeded = totalG > threshold;
  const expiring = useMemo(
    () =>
      items.filter((i) => {
        if (!i.expires_at) return false;
        const d = new Date(i.expires_at).getTime();
        return d - Date.now() < 1000 * 60 * 60 * 24 * 30;
      }),
    [items],
  );

  const add = async () => {
    if (!draft.name?.trim()) {
      toast.error("Name required");
      return;
    }
    const item: LocalGearItem = {
      id: crypto.randomUUID(),
      user_id: null,
      name: draft.name!.trim(),
      category: draft.category || "tools",
      quantity: Number(draft.quantity) || 1,
      weight_g: Number(draft.weight_g) || 0,
      notes: null,
      expires_at: draft.expires_at || null,
      packed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      dirty: true,
    };
    await saveGear(item);
    setItems((x) => [...x, item]);
    setDraft({ category: draft.category, quantity: 1, weight_g: 100, packed: false });
    toast.success("Added to inventory");
  };

  const togglePacked = async (i: LocalGearItem) => {
    const next = { ...i, packed: !i.packed, updated_at: new Date().toISOString(), dirty: true };
    await saveGear(next);
    setItems((x) => x.map((y) => (y.id === i.id ? next : y)));
  };

  const remove = async (id: string) => {
    await deleteGear(id);
    setItems((x) => x.filter((y) => y.id !== id));
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="mono text-tactical-orange text-2xl md:text-3xl font-bold tracking-wider flex items-center gap-2">
            <Backpack className="h-6 w-6" /> BUG-OUT BAG
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Inventory, weight tracking, and expiration alerts.
          </p>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <div className={`rounded-md border p-3 ${exceeded ? "border-destructive bg-destructive/10" : "border-border bg-card"}`}>
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Packed weight</div>
          <div className={`text-2xl font-bold mono ${exceeded ? "text-destructive" : "text-tactical-orange"}`}>
            {(totalG / 1000).toFixed(2)} kg
          </div>
          <div className="text-xs text-muted-foreground mono">
            Threshold {(threshold / 1000).toFixed(1)} kg
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Items</div>
          <div className="text-2xl font-bold mono">{items.length}</div>
        </div>
        <div className={`rounded-md border p-3 ${expiring.length ? "border-tactical-amber bg-tactical-amber/10" : "border-border bg-card"}`}>
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">Expiring (30d)</div>
          <div className="text-2xl font-bold mono flex items-center gap-2">
            {expiring.length}
            {expiring.length > 0 && <AlertTriangle className="h-5 w-5 text-tactical-amber" />}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4 mb-6">
        <h3 className="mono text-xs uppercase tracking-widest text-muted-foreground mb-3">Add gear</h3>
        <div className="grid md:grid-cols-5 gap-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Name</Label>
            <Input
              value={draft.name || ""}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ferro rod"
            />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <select
              className="w-full bg-input rounded-md h-10 px-2 border border-border text-sm"
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Qty</Label>
            <Input
              type="number"
              min={1}
              value={draft.quantity || 1}
              onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Weight (g)</Label>
            <Input
              type="number"
              min={0}
              value={draft.weight_g || 0}
              onChange={(e) => setDraft({ ...draft, weight_g: Number(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Expires (optional)</Label>
            <Input
              type="date"
              value={draft.expires_at || ""}
              onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Threshold (kg)</Label>
            <Input
              type="number"
              value={threshold / 1000}
              onChange={(e) => setThreshold(Number(e.target.value) * 1000)}
            />
          </div>
          <div className="md:col-span-5">
            <Button onClick={add} className="w-full bg-tactical-orange text-background glove-tap">
              <Plus className="h-4 w-4 mr-1" /> Add to bag
            </Button>
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className="rounded-md border border-border bg-card p-3 flex items-center gap-3"
          >
            <input
              type="checkbox"
              checked={i.packed}
              onChange={() => togglePacked(i)}
              className="h-5 w-5 accent-tactical-orange"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{i.name}</div>
              <div className="text-xs text-muted-foreground mono">
                {i.category} · {i.quantity}× · {i.weight_g}g
                {i.expires_at && ` · exp ${i.expires_at}`}
              </div>
            </div>
            <button
              onClick={() => remove(i.id)}
              className="tap-target text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-center text-muted-foreground py-8 text-sm">
            No gear yet. Add your first item above.
          </li>
        )}
      </ul>
    </div>
  );
}
