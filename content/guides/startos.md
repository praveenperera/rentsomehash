---
title: "StartOS node setup for DATUM"
description: "Use this if you already run StartOS and want to reuse that box for DATUM before continuing to the shared Braiins guide."
slug: startos
order: 2
stage: node
summary: "Reuse StartOS, install the right packages, and expose DATUM through Start Tunnel or a stable static public IP."
navLabel: "StartOS"
setupType: "Existing StartOS setup"
eyebrow: "Step 1: Node setup"
featured: false
updated: "2026-04-06"
---

## When this guide makes sense

Use this guide if you want to use StartOS instead, or if you are already running StartOS 0.4.0, which is the setup advised in the source notes.

> Do not use a raw dynamic home IP with Braiins. Braiins will not let you change the stratum target inside an existing bid, and deposited funds should not be treated like a withdrawable wallet balance. If your home IP changes after you fund Braiins, you can be stuck with sats tied to a dead endpoint. Use DDNS, Start Tunnel, or a stable static public IP before funding Braiins.

There are two broad ways to expose the service:

- Forward a port from your router and give Braiins a DDNS hostname or stable static public IP
- Use Start Tunnel and let it front the service for you

The second option is probably the correct way to do this generally.

## Why Start Tunnel is the cleaner route

Start Tunnel acts like a router in the sky.

It forwards traffic to your home over VPN, lets some VPS provider know you're a miner, gives you a static IP, and makes life much easier if your home connection does not have a static IP, which almost no one does.

It also means you do not have to rely on a home IP that might change and break the bid later.

## 1. Install BIP-110 on StartOS

Grab the latest release here:

<https://github.com/dathonohm/knots-startos/releases>

Install that package on your StartOS box.

StartOS already exposes the Knots settings relevant to DATUM, including `blocknotify`, `blockmaxsize`, `blockmaxweight`, `maxmempool`, and `blockreconstructionextratxn`.

DATUM on StartOS also auto-configures `blocknotify`, so this is not the same gap as Umbrel.

The StartOS Knots defaults already line up with DATUM's recommended block space reservation values for `blockmaxsize` and `blockmaxweight`.

If you want the higher DATUM-style tuning values beyond that, still review the Knots advanced settings before you move on, especially `maxmempool` and `blockreconstructionextratxn`.

## 2. Install the DATUM gateway

Install the DATUM gateway from the Start9 marketplace.

Once it is installed, make sure it is the service you are actually exposing to Braiins, not some other node endpoint by accident.

## 3. Set up Start Tunnel

Get a VPS and install Start Tunnel using the official docs:

<https://docs.start9.com/start-tunnel/1.0.x/>

Then follow the instructions to make your DATUM gateway use Start Tunnel.

## 4. Point Braiins at the tunnel endpoint

When Start Tunnel is in front of the gateway, Braiins should use:

```text
stratum+tcp://your-vps-ip:23334
```

Replace `your-vps-ip` with the public IP of the VPS running Start Tunnel.

## 5. If you skip Start Tunnel

If you choose to forward a port directly from your router to the StartOS machine instead, the forwarded traffic still lands on the box on your local network.

Braiins still needs a stable public endpoint, not the private LAN address.

For a home connection, that usually means a DDNS hostname:

```text
stratum+tcp://hostname.domain.com:23334
```

Replace `hostname.domain.com` with the actual DDNS hostname your router keeps updated.

If you are not using DDNS, only use the raw public IP when your ISP actually gives you a stable static public IP.

Do not point Braiins at a rotating home IP. Braiins will not let you change the stratum target inside an existing bid.

## What you bring into Braiins

Once this guide is done, bring these values into the shared Braiins guide:

- If you used Start Tunnel: `stratum+tcp://your-start-tunnel-vps-ip:23334`
- If you used direct port forwarding with DDNS: `stratum+tcp://hostname.domain.com:23334`
- If you used direct port forwarding with a stable static IP: `stratum+tcp://your-public-ip:23334`
- Pool username: `bc1qyourrealbitcoinaddress.someworkername`

Then continue here:

<https://rentsomehash.com/guides/braiins-ocean/>

## Why use this guide

- You already have a StartOS box you trust, so you can reuse it instead of rebuilding the whole stack on a fresh VPS
- Start Tunnel gives Braiins a stable public endpoint without handing over your literal home IP
- Your node and DATUM stay on hardware you already control, which is the whole point of this route
- If you support BIP-110, this route lets you keep that node on StartOS and point rented hash at that setup
