export function reloadPage(): void {
  if (typeof window !== "undefined" && typeof window.location.reload === "function") {
    window.location.reload();
  }
}
