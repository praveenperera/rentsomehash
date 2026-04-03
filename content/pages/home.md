---
title: "Rent Some Hash: Braiins to DATUM to OCEAN guide"
description: "Mechanic's guide for renting hashpower on Braiins, pointing it at DATUM, and using it to make your own blocks on OCEAN."
eyebrow: "Mechanic's guide"
primaryCtaLabel: "Read the main guide"
primaryCtaHref: "/guides/braiins-ocean/"
secondaryCtaLabel: "Home node guides"
secondaryCtaHref: "/#routes"
highlights:
  - title: "Get the node and DATUM online first"
    body: "The longest part is getting the box up and syncing. The main route assumes a fresh Linux VPS and builds a combined node + DATUM machine so the parts already fit together."
  - title: "Braiins is just the hashpower side"
    body: "Once the box is ready, Braiins is mostly account setup, funding, and entering the right pool URL and username without typos."
  - title: "Use the home node guides (StartOS, Umbrel) if you already run home hardware"
    body: "If you already trust a home box more than a fresh VPS, use the home node guides and expose DATUM from the box you already run."
warnings:
  - title: "Bring a Bitcoin address you actually control"
    body: "The installer asks for `POOL_ADDRESS`, and that has to be a valid Bitcoin address with keys you control. If you change DATUM behavior later, rewards can still flow there."
  - title: "Pruning is the sane default on a VPS"
    body: "If this is a rented machine, pruning to 550 is the practical choice. Running an archival node on a VPS is usually paying for storage you do not need for this workflow."
  - title: "Braiins fields are easy to get almost right"
    body: "The mining pool URL must point to your DATUM box on port `23334`, and the pool username format matters. Small mistakes there are the fastest way to waste time."
---

This is a cleaned-up version of Mechanic's workflow for getting from zero to a working Braiins-to-OCEAN setup.

Start with the main route if you want the shortest path and are happy to spin up a Linux VPS just for this. If you already run StartOS or Umbrel, skip to the home node guides and reuse what you already have.
