import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@candoo/api-client", () => ({
  createCandooClient: vi.fn(() => ({})),
}));

import { createCandooClient } from "@candoo/api-client";

const mockCreateCandooClient = vi.mocked(createCandooClient);

async function loadClientModule() {
  return import("../src/client.js");
}

describe("client backend configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env["CANDOO_API_URL"];
    delete process.env["SUPABASE_URL"];
    delete process.env["SUPABASE_ANON_KEY"];
  });

  it("uses the built-in backend by default", async () => {
    const { getClient, CLI_DEFAULT_BACKEND } = await loadClientModule();

    getClient();

    expect(mockCreateCandooClient).toHaveBeenCalledWith({
      baseUrl: "https://qvwhayspqbzmtuwxdlnk.supabase.co/functions/v1/api",
      supabaseUrl: "https://qvwhayspqbzmtuwxdlnk.supabase.co",
      supabaseAnonKey: CLI_DEFAULT_BACKEND.supabaseAnonKey,
    });
  });

  it("uses explicit custom backend flags with --custom-backend", async () => {
    const { configureClient, getClient } = await loadClientModule();

    configureClient({
      customBackend: true,
      apiUrl: "https://custom.example/api",
      supabaseUrl: "https://custom.example",
      supabaseAnonKey: "custom-anon",
    });
    getClient();

    expect(mockCreateCandooClient).toHaveBeenCalledWith({
      baseUrl: "https://custom.example/api",
      supabaseUrl: "https://custom.example",
      supabaseAnonKey: "custom-anon",
    });
  });

  it("uses env vars for custom backend when flags are omitted", async () => {
    process.env["CANDOO_API_URL"] = "https://env.example/api";
    process.env["SUPABASE_URL"] = "https://env.example";
    process.env["SUPABASE_ANON_KEY"] = "env-anon";
    const { configureClient, getClient } = await loadClientModule();

    configureClient({ customBackend: true });
    getClient();

    expect(mockCreateCandooClient).toHaveBeenCalledWith({
      baseUrl: "https://env.example/api",
      supabaseUrl: "https://env.example",
      supabaseAnonKey: "env-anon",
    });
  });

  it("rejects custom backend flags unless --custom-backend is set", async () => {
    process.env["SUPABASE_ANON_KEY"] = "default-anon";
    const { configureClient, getClient } = await loadClientModule();

    configureClient({ apiUrl: "https://custom.example/api" });

    expect(() => getClient()).toThrow("Custom backend flags require --custom-backend");
  });

  it("requires full custom backend config when --custom-backend is set", async () => {
    const { configureClient, getClient } = await loadClientModule();

    configureClient({
      customBackend: true,
      apiUrl: "https://custom.example/api",
      supabaseUrl: "https://custom.example",
    });

    expect(() => getClient()).toThrow("--supabase-anon-key");
  });
});
