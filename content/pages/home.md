---
title: "Rent Some Hash: rent hashpower to your DATUM node"
description: "Set up a DATUM node, then choose PickHash with MiningRigRentals or Braiins to aim rented hashpower at your own block templates on OCEAN."
eyebrow: "Hashpower → DATUM → OCEAN"
primaryCtaLabel: "Choose a node guide"
primaryCtaHref: "/#node-guides"
secondaryCtaLabel: "Compare rental options"
secondaryCtaHref: "/#hashpower-guides"
highlights:
  - title: "Pick one node setup and make DATUM reachable"
    body: "Use the VPS guide if you are starting from zero. If you already run StartOS or Umbrel hardware you trust, use that guide instead. You should finish with a synced node, a running DATUM gateway, and a public hostname that rented rigs can reach."
  - title: "Choose how you want to rent hashpower"
    body: "Use PickHash with MiningRigRentals for self-hosted control and privacy, or Braiins for a hosted order book with cancellable, pay-as-delivered bids."
warnings:
  - title: "Bring a Bitcoin address you actually control"
    body: "The installer asks for `POOL_ADDRESS`, and that has to be a valid Bitcoin address with keys you control. If you change DATUM behavior later, rewards can still flow there."
  - title: "Pruning is the sane default on a VPS"
    body: "If this is a rented machine, pruning to 550 is the practical choice. Running an archival node on a VPS is usually paying for storage you do not need for this workflow."
  - title: "Check each marketplace's funding rules"
    body: "MiningRigRentals charges renters a fee and limits refunds, including for IP-address and self-hosted pools. Braiins deposits generally cannot be withdrawn. Start small and read the current terms before funding either account."
  - title: "Know how your order stops"
    body: "PickHash can stop adding rigs, but prepaid MiningRigRentals contracts continue until they expire. Braiins bids can be canceled and return the unspent budget after settlement. Choose the model you are prepared to monitor."
---

Start with one node guide. Once it leaves you with a working DATUM endpoint, compare the two rental paths and choose the operational model that fits you.

If you want that node to run the BIP-110 build, use the guide that matches your setup and check [bip110.org](https://bip110.org/) for the proposal and install context.
