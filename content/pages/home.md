---
title: "Rent Some Hash: Braiins to DATUM to OCEAN guide"
description: "Guide for setting up a DATUM node first, then using Braiins hashpower to point at it and make your own blocks on OCEAN."
eyebrow: "Braiins → DATUM → OCEAN"
primaryCtaLabel: "Choose a node guide"
primaryCtaHref: "/#node-guides"
secondaryCtaLabel: "Open Braiins guide"
secondaryCtaHref: "/guides/braiins-ocean/"
highlights:
  - title: "Pick one node setup and make DATUM reachable"
    body: "Use the VPS guide if you are starting from zero and want the path that fits the most people. If you already run StartOS or Umbrel hardware you trust, it usually makes more sense to use that guide instead. That guide should leave you with a synced node, a running DATUM gateway, and a public endpoint or hostname that Braiins can actually reach."
  - title: "Use the Braiins guide once the node is ready"
    body: "The Braiins side is shared: create the account, fund it, enter the right mining pool URL, and use the correct username format without typos."
warnings:
  - title: "Bring a Bitcoin address you actually control"
    body: "The installer asks for `POOL_ADDRESS`, and that has to be a valid Bitcoin address with keys you control. If you change DATUM behavior later, rewards can still flow there."
  - title: "Pruning is the sane default on a VPS"
    body: "If this is a rented machine, pruning to 550 is the practical choice. Running an archival node on a VPS is usually paying for storage you do not need for this workflow."
  - title: "Braiins fields are easy to get almost right"
    body: "Do not fund Braiins against a raw dynamic home IP. Braiins will not let you change the stratum target inside an existing bid, and deposited funds should not be treated like a withdrawable wallet balance. For home-hosted setups, use DDNS, tunneling, or a stable static public IP first."
---

Start with one node guide. Once that guide leaves you with a working DATUM endpoint, move to the shared Braiins guide and create the bid there.
