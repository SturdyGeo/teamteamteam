import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpClient } from "../src/http.js";
import { ApiError } from "../src/errors.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("HttpClient", () => {
  const mockFetch = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  let client: HttpClient;
  const getToken = vi.fn<() => Promise<string | null>>();

  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    getToken.mockResolvedValue("test-token");
    client = new HttpClient({ baseUrl: "https://api.example.com", getToken });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws UNAUTHORIZED when getToken returns null", async () => {
    getToken.mockResolvedValue(null);
    await expect(client.get("/orgs")).rejects.toThrow(ApiError);
    await expect(client.get("/orgs")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      statusCode: 401,
    });
  });

  it("sends GET request with auth header", async () => {
    mockFetch.mockResolvedValue(jsonResponse([{ id: "1" }]));
    const result = await client.get("/orgs");
    expect(result).toEqual([{ id: "1" }]);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/orgs",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("sends POST request with body", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: "new" }));
    const body = { name: "Test Org" };
    await client.post("/orgs", body);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/orgs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  });

  it("sends PATCH request with body", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: "1" }));
    await client.patch("/tickets/1/move", { to_column_id: "col-2" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/tickets/1/move",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ to_column_id: "col-2" }),
      }),
    );
  });

  it("sends DELETE request", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: "1" }));
    await client.delete("/tickets/1/tags/bug");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/tickets/1/tags/bug",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws ApiError on error response with structured body", async () => {
    mockFetch.mockResolvedValue(
      errorResponse("NOT_FOUND", "Ticket not found", 404),
    );
    await expect(client.get("/tickets/999")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Ticket not found",
      statusCode: 404,
    });
  });

  it("throws ApiError with defaults when error body is not JSON", async () => {
    mockFetch.mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );
    const err: ApiError = await client
      .get("/fail")
      .catch((e: ApiError) => e) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("UNKNOWN");
    expect(err.statusCode).toBe(500);
  });

  it("strips trailing slashes from baseUrl", async () => {
    const c = new HttpClient({
      baseUrl: "https://api.example.com///",
      getToken,
    });
    mockFetch.mockResolvedValue(jsonResponse([]));
    await c.get("/orgs");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/orgs",
      expect.anything(),
    );
  });

  it("does not include body for GET requests", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]));
    await client.get("/orgs");
    const call = mockFetch.mock.calls[0];
    expect(call?.[1]?.body).toBeUndefined();
  });

  it("does not include body for DELETE requests", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    await client.delete("/tickets/1/tags/bug");
    const call = mockFetch.mock.calls[0];
    expect(call?.[1]?.body).toBeUndefined();
  });

  it("POST without body does not include body field", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    await client.post("/tickets/1/close");
    const call = mockFetch.mock.calls[0];
    expect(call?.[1]?.body).toBeUndefined();
  });

  it("PATCH without body does not include body field", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    await client.patch("/tickets/1/close");
    const call = mockFetch.mock.calls[0];
    expect(call?.[1]?.body).toBeUndefined();
  });
});
