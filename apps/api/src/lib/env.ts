declare const Deno: { env: { get(key: string): string | undefined } } | undefined;

export function env(key: string): string | undefined {
  if (typeof Deno !== "undefined") return Deno.env.get(key);
  return process.env[key];
}
