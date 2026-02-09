// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

function makeRequest(url: string, cookie?: string) {
  const headers = new Headers({ host: "apps.serp.co" });
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(new Request(url, { headers }));
}

describe("middleware dub cookies", () => {
  it("does not set Dub cookies from ?via", () => {
    const response = middleware(makeRequest("https://apps.serp.co/?via=mds"));

    expect(response.cookies.get("dub_id")).toBeUndefined();
    expect(response.cookies.get("dub_partner_data")).toBeUndefined();
    expect(response.cookies.get("affiliateId")).toBeUndefined();
  });

  it("sets dub_id cookie from ?dub_id when missing", () => {
    const response = middleware(makeRequest("https://apps.serp.co/?dub_id=dub_id_test_123"));

    expect(response.cookies.get("dub_id")?.value).toBe("dub_id_test_123");
    expect(response.cookies.get("dub_partner_data")).toBeUndefined();
  });

  it("does not override an existing dub_id cookie", () => {
    const response = middleware(
      makeRequest("https://apps.serp.co/?dub_id=dub_id_new", "dub_id=dub_id_existing")
    );

    expect(response.cookies.get("dub_id")).toBeUndefined();
  });

  it("does not override an existing affiliateId cookie", () => {
    const response = middleware(
      makeRequest("https://apps.serp.co/?via=mds", "affiliateId=existing")
    );

    expect(response.cookies.get("affiliateId")).toBeUndefined();
  });

  it("does not override affiliateId query param with ?via", () => {
    const response = middleware(makeRequest("https://apps.serp.co/?affiliateId=explicit&via=mds"));

    expect(response.cookies.get("affiliateId")?.value).toBe("explicit");
  });
});
