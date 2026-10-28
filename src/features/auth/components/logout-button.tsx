"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { endSession } from "../client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        await endSession();
        router.replace("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden /> <span className="max-sm:sr-only">Terminar sessão</span>
    </Button>
  );
}
