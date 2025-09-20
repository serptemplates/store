---
title: "Template Rollout Checklist for New Downloaders"
description: "Use this five-step checklist every time you push the default SERP Apps lander to production."
date: "2025-02-15"
author: "Ops Team"
tags:
  - operations
  - checklist
draft: true
---

- Verify product YAML fields are filled in (pricing, testimonials, features).
- Swap the hero video and screenshots for the latest marketing assets.
- Update purchase and product URLs to production destinations.
- Run `pnpm lint` + `pnpm typecheck` before pushing to main.
- Schedule a post-launch QA pass 24 hours after go-live.
