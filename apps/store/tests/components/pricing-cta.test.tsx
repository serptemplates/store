import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { PricingCta } from "@repo/ui/sections/PricingCta";

describe("PricingCta", () => {
  it("renders without an order bump by default", () => {
    const { queryByTestId } = render(
      <PricingCta
        heading="Download now"
        subheading="Secure access in minutes"
        price="$47"
        benefits={["Unlimited downloads", "Lifetime updates"]}
      />,
    );

    expect(queryByTestId("pricing-cta-order-bump")).toBeNull();
  });

  it("suppresses the order bump card when content is empty", () => {
    const { queryByTestId } = render(
      <PricingCta
        heading="Download now"
        price="$47"
        orderBump={{
          title: "",
          description: "",
          price: "",
          points: [],
          bullets: [],
        }}
      />,
    );

    expect(queryByTestId("pricing-cta-order-bump")).toBeNull();
  });

  it("shows the order bump when meaningful details are provided", () => {
    render(
      <PricingCta
        heading="Download now"
        price="$47"
        orderBump={{
          id: "bundle",
          title: "Upgrade to Bundle",
          description: "Unlock every downloader we offer.",
          price: "$47",
          points: ["All current downloaders", "Future additions included"],
          defaultSelected: true,
        }}
      />,
    );

    expect(screen.getByTestId("pricing-cta-order-bump")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Bundle")).toBeInTheDocument();
    expect(screen.getByText("Unlock every downloader we offer.")).toBeInTheDocument();
  });
});
