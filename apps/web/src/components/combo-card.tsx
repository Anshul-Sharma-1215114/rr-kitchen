"use client";

import Link from "next/link";
import Image from "next/image";
import type { Combo } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { resolveImageUrl } from "@/lib/api-url";

export function ComboCard({ combo }: { combo: Combo }) {
  const imageUrl = resolveImageUrl(combo.imageUrl);
  return (
    <Link
      href={`/combo/${combo.id}`}
      className="flex flex-col overflow-hidden rounded-2xl border-2 border-leaf-200 bg-leaf-50 shadow-sm transition hover:border-leaf-400 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-leaf-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={combo.name}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-leaf-300">
            <span className="text-4xl">🍱</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-leaf-600 px-2 py-0.5 text-xs font-semibold text-white">
          Combo
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-semibold leading-tight">{combo.name}</span>
        {combo.description && <p className="line-clamp-2 text-sm text-charcoal/60">{combo.description}</p>}
        <p className="mt-1 text-xs text-charcoal/50">Includes {combo.items.length} items</p>
        <div className="mt-auto pt-3">
          <span className="text-lg font-semibold text-leaf-700">{formatInr(combo.price)}</span>
        </div>
      </div>
    </Link>
  );
}
