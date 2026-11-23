import { describe, expect, it } from "vitest";

import { describeFetchError } from "./fetch";
import { findFrameUrl } from "./strategies/generic";

describe("findFrameUrl", () => {
  it("resolve o src relativo do iframe", () => {
    const html = `<html><body><iframe src="/nfeweb/render?p=1"></iframe></body></html>`;
    expect(findFrameUrl(html, "https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p=1")).toBe(
      "https://nfeweb.sefaz.go.gov.br/nfeweb/render?p=1",
    );
  });

  it("retorna null sem iframe", () => {
    expect(findFrameUrl("<html><body>oi</body></html>", "https://x.gov.br/")).toBeNull();
  });
});

describe("describeFetchError", () => {
  it("timeout", () => {
    const e = new Error("aborted");
    e.name = "AbortError";
    expect(describeFetchError(e)).toMatch(/demorou/);
  });

  it("certificado", () => {
    const e = new Error("fetch failed", { cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } });
    expect(describeFetchError(e)).toMatch(/certificado/);
  });

  it("HTTP", () => {
    expect(describeFetchError(new Error("HTTP 403"))).toMatch(/403/);
  });
});
