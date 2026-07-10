import { Baby } from "lucide-react";
import type { Child } from "@/lib/types/database";

type ChildAvatarProps = {
  child: Pick<Child, "name" | "gender" | "photo_url">;
  size?: "sm" | "md";
};

export default function ChildAvatar({ child, size = "sm" }: ChildAvatarProps) {
  const dim = size === "md" ? "h-16 w-16" : "h-10 w-10";
  const iconSize = size === "md" ? "h-8 w-8" : "h-5 w-5";
  const photo = child.photo_url?.trim();

  if (photo) {
    return (
      <img
        src={photo}
        alt={child.name || "Child photo"}
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  const bg =
    child.gender === "female"
      ? "bg-pink-100 text-pink-700"
      : "bg-sky-100 text-sky-700";

  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${bg}`}
    >
      <Baby className={iconSize} aria-hidden />
    </div>
  );
}
