"use client";

export function HeaderDate() {
  return (
    <h2 className="text-sm font-medium text-muted-foreground">
      {new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </h2>
  );
}
