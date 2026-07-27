---
title: "Rent hashpower with PickHash and MiningRigRentals"
description: "Install PickHash, connect a narrowly scoped MiningRigRentals API key, point rentals at your DATUM endpoint, and rehearse the order before spending sats."
slug: pickhash
order: 1
stage: hashpower
provider: pickhash
approach: "Self-hosted controller + MiningRigRentals"
bestFor: "Privacy, local control, and avoiding Telegram"
tradeoffs:
  - "Prepaid rentals keep running until they expire"
  - "3% renter fee and per-rig delivery variance"
  - "More software, credentials, and networking to operate"
summary: "Use PickHash to turn individual MiningRigRentals rigs into one budgeted, monitored hashpower session aimed at your DATUM node."
navLabel: "PickHash"
setupType: "StartOS, Umbrel, or Docker"
eyebrow: "Step 2: Self-hosted hashpower setup"
featured: true
updated: "2026-07-26"
---

PickHash is a self-hosted controller for [MiningRigRentals](https://www.miningrigrentals.com/). You choose a target hashrate, budget, and time cap; PickHash finds suitable SHA-256 AsicBoost rigs, creates the rentals, points them at your DATUM endpoint, and monitors delivery.

[Watch Paul Lamb's PickHash walkthrough](https://www.youtube.com/watch?v=QODtoBSir88) or open the [PickHash source and releases](https://github.com/paulscode/pickhash).

> PickHash is new software that can spend real Bitcoin. Start in `DRY-RUN`, use a rental-only API key, set conservative guardrails, and review the current release notes before switching to `LIVE`.

## Before you start

Finish one node guide first:

- [Fresh VPS node setup](/guides/vps/)
- [StartOS node setup](/guides/startos/)
- [Umbrel node setup](/guides/umbrel/)

That guide should leave you with:

- A synced Bitcoin node
- A running DATUM gateway
- A public stratum hostname and port that serve work
- The Bitcoin address that receives your OCEAN rewards

You also need:

- A [MiningRigRentals](https://www.miningrigrentals.com/) account
- Bitcoin deposited to the MiningRigRentals account
- PickHash installed on StartOS, Umbrel, or Docker

## 1. Install PickHash

### StartOS

Download the package that matches your StartOS version from the [latest PickHash release](https://github.com/paulscode/pickhash/releases/latest):

- StartOS 0.3.5.x: `pickhash-0351.s9pk`
- StartOS 0.4.x: `pickhash-040.s9pk`

Use the StartOS **Sideload** action to upload the package, then open PickHash and follow its setup wizard.

You can optionally install [HashGG](https://github.com/paulscode/hashgg) so PickHash can discover a public stratum endpoint automatically.

### Umbrel

1. Open **App Store** in Umbrel.
2. Open the menu in the upper-right and select **Community App Stores**.
3. Add `https://github.com/paulscode/umbrel-store`.
4. Open the **PaulsCode.Com** store and install **PickHash**.

HashGG is optional on Umbrel too. If it is not installed, enter the public DATUM endpoint manually.

### Docker

Follow the Docker instructions in the [PickHash README](https://github.com/paulscode/pickhash#docker). Protect the mounted data directory because it contains the encryption key and encrypted marketplace credentials.

## 2. Create the MiningRigRentals API key

In MiningRigRentals, open **Account → API**, add a key, and give it only the permissions PickHash needs:

- **Rental:** Write
- **Balance / Withdrawal:** Read only, never Write
- **Rigs:** None

Copy the key and secret into the PickHash wizard. The read setting lets PickHash see the account balance without allowing it to withdraw funds.

## 3. Add your DATUM endpoint

PickHash needs three pool values:

- **Host:** your public DATUM hostname
- **Port:** usually `23334`
- **Worker:** your OCEAN payout address followed by a worker name

For example:

```text
Host: datum.example.com
Port: 23334
Worker: bc1qyourrealbitcoinaddress.pickhash
```

Use the same Bitcoin address configured in DATUM. PickHash adds a rental-specific suffix so individual rigs remain visible in OCEAN.

Run PickHash's endpoint test and do not continue until it confirms the endpoint serves work.

> Prefer a hostname over a bare IP. MiningRigRentals does not refund rentals aimed at IP-based pools. If you enter a raw IP, PickHash can create and maintain a DuckDNS name for it.

## 4. Fund MiningRigRentals

PickHash does not hold the rental balance. Deposit Bitcoin to the address shown for your MiningRigRentals account and wait for the required confirmations.

Treat the deposit as money committed to a third-party marketplace. Check the marketplace's current deposit, withdrawal, fee, and refund terms before sending a large amount.

## 5. Rehearse the rental

PickHash starts in `DRY-RUN`. Keep it there while you:

1. Choose **Autopilot** for a maintained target or **Quick Rent** for a one-time order.
2. Enter a small target hashrate, budget, and time cap.
3. Review the estimated rigs, blended rate, and total spend.
4. Set the max-session budget, rolling 24-hour cap, and optional price ceiling in **Settings**.
5. Confirm the planned session without switching to `LIVE`.

Nothing is rented or spent during a dry run.

## 6. Go live carefully

When the rehearsal looks right:

1. Confirm DATUM is still reachable and serving work.
2. Confirm your MiningRigRentals balance and PickHash guardrails.
3. Switch PickHash from `DRY-RUN` to `LIVE`.
4. Start with a small session and watch the first rigs ramp up.

Autopilot fills the target gradually and can top it up as rentals expire. Stopping an active session prevents new rentals, but rental time already purchased keeps running until it expires.

## 7. Watch delivery and refunds

Use PickHash's active-rental and history views to watch:

- Delivered hashrate versus target
- Ramping, healthy, degraded, or offline rigs
- Actual spend and remaining budget
- Under-delivery and marketplace refunds

MiningRigRentals usually reviews under-delivering rentals and may refund the difference. Keep the endpoint on a hostname and preserve the session evidence PickHash collects in case you need a support ticket.

## Why choose PickHash

- It turns many separate MiningRigRentals rigs into one budgeted session
- It starts with a spend-free rehearsal mode
- It monitors ramp-up, under-delivery, offline rigs, and refunds
- It supports session and daily spend caps plus a price ceiling
- It keeps your own DATUM endpoint and block templates at the center of the setup

Prefer [Braiins](/guides/braiins-ocean/) if you want a hosted order book with cancellable, pay-as-delivered bids and fewer components to operate.
