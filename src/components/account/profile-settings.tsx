"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { setDisplayName, uploadAvatar, type Account } from "@/lib/account";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

function Initials({ name }: { name: string }) {
  const letters = name.trim().slice(0, 2).toUpperCase() || "??";
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full
                     border border-border bg-secondary text-lg font-semibold text-muted-foreground">
      {letters}
    </span>
  );
}

export function ProfileSettings({ account, onChanged }:
  { account: Account; onChanged: () => void }) {
  const [display, setDisplay] = useState(account.display_name);
  const [busy, setBusy] = useState<"name" | "avatar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = display.trim() !== account.display_name && display.trim().length > 0;

  async function saveName() {
    setBusy("name");
    setError(null);
    setSaved(false);
    try {
      await setDisplayName(display.trim());
      setSaved(true);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function pickAvatar(file: File | undefined) {
    if (!file) return;
    // Checked here as well as on the server so the usual mistake costs no upload
    // and gets a specific answer, rather than a 413 after the bytes have gone.
    if (!AVATAR_TYPES.includes(file.type)) {
      setError("Profile pictures must be a PNG, JPEG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("That image is over 2 MB. Pick a smaller one.");
      return;
    }
    setBusy("avatar");
    setError(null);
    try {
      await uploadAvatar(file);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that. Try again.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>How you appear across the marketplace and contracts.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-4">
          {account.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, not a static asset
            <img src={account.avatar_url} alt=""
                 className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <Initials name={account.display_name} />
          )}

          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={(e) => pickAvatar(e.target.files?.[0])}
            />
            <Button variant="secondary" size="sm" className="gap-2"
                    disabled={busy !== null}
                    onClick={() => fileRef.current?.click()}>
              {busy === "avatar" ? <Loader2 className="h-4 w-4 animate-spin" />
                                 : <Upload className="h-4 w-4" />}
              Change picture
            </Button>
            <span className="text-xs text-muted-foreground">PNG, JPEG or WebP, up to 2 MB.</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Username</span>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-sm">
              {account.username || "not set"}
            </code>
            <Badge variant="secondary">Permanent</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground" htmlFor="display-name">
            Display name
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="display-name"
              value={display}
              maxLength={32}
              onChange={(e) => { setDisplay(e.target.value); setSaved(false); }}
              className="filter-input max-w-xs"
            />
            <Button size="sm" disabled={!dirty || busy !== null} onClick={saveName}
                    className="gap-2">
              {busy === "name" && <Loader2 className="h-4 w-4 animate-spin" />}
              {saved && !dirty ? <><Check className="h-4 w-4" /> Saved</> : "Save"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sign-in:</span>
          {account.has_password_login && <Badge variant="secondary">Google / email</Badge>}
          {account.has_discord && <Badge variant="secondary">Discord</Badge>}
          {account.email && (
            <span className="text-xs text-muted-foreground">{account.email}</span>
          )}
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
