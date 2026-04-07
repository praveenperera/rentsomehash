---
title: "Umbrel node setup for DATUM"
description: "Use this if you already run Umbrel and want to reuse that box for DATUM before continuing to the shared Braiins guide."
slug: umbrel
order: 3
stage: node
summary: "Reuse Umbrel, install Bitcoin Knots and DATUM, then expose DATUM on port 23334."
navLabel: "Umbrel"
setupType: "Existing Umbrel setup"
eyebrow: "Step 1: Node setup"
featured: false
updated: "2026-04-06"
---

## When this guide makes sense

Use this guide if you already run Umbrel and want to keep the node and DATUM on hardware you already trust.

> Do not use a raw dynamic home IP with Braiins. Braiins will not let you change the stratum target inside an existing bid, and deposited funds should not be treated like a withdrawable wallet balance. If your home IP changes after you fund Braiins, you can be stuck with sats tied to a dead endpoint. Use DDNS, a tunnel, or a stable static public IP before funding Braiins.

This guide leaves you with an Umbrel-hosted DATUM endpoint ready for the shared Braiins guide:

- Install Bitcoin Knots on Umbrel
- Install DATUM on Umbrel
- Configure DATUM correctly
- Forward port `23334` from your router to the Umbrel box
- Carry the public endpoint into the Braiins guide

## Why port forwarding is the straightforward route here

On Umbrel, DATUM listens on port `23334`.

On your local network, miners point at the Umbrel box IP directly. For Braiins, you need that same DATUM port reachable from the internet, so the straightforward route is to forward `23334` from your router to the Umbrel machine.

That keeps the setup simple and avoids turning this guide into a separate tunnel guide.

## 1. Install Bitcoin Knots on Umbrel

Install Bitcoin Knots from the Umbrel App Store:

<https://apps.umbrel.com/app/bitcoin-knots>

![Umbrel App Store search results showing the Bitcoin Knots app](/images/guides/umbrel/bitcoin-knots-install.png)

The Knots app includes BIP-110 in the version selector, so if you want that build, select the BIP-110 version in the app settings.

![Umbrel Bitcoin Knots settings showing the BIP-110 version selector](/images/guides/umbrel/bitcoin-knots-bip110.png)

If your box is still syncing, let that finish before you try to use DATUM for anything serious.

## 2. Install DATUM on Umbrel

Install DATUM from the Umbrel App Store:

<https://apps.umbrel.com/app/datum>

![Umbrel App Store search results showing the DATUM app](/images/guides/umbrel/datum-install.png)

If Umbrel asks which node client DATUM should use during setup, select Bitcoin Knots.

DATUM depends on Bitcoin Knots and connects to it automatically after installation.

## 3. Review the Knots settings before you test anything

Umbrel wires DATUM to Bitcoin Knots automatically, but you should still review the Knots node settings before you point hashpower at it.

The upstream DATUM README currently recommends reserving some block space for the pool payout transaction with:

```text
blockmaxsize=3985000
blockmaxweight=3985000
```

It also recommends these additional node settings:

```text
maxmempool=1000
blockreconstructionextratxn=1000000
```

The upstream DATUM README also requires block notifications from your node. If the Umbrel package does not handle that for you, review DATUM's node configuration guidance before using this route:

<https://github.com/OCEAN-xyz/datum_gateway?tab=readme-ov-file#node-configuration>

Umbrel's settings search helps you jump straight to each field:

![Bitcoin Knots settings search in Umbrel showing where to edit DATUM-related node values](/images/guides/umbrel/bitcoin-knots-settings.png)

![Bitcoin Knots settings search in Umbrel showing the block reconstruction extra transaction field](/images/guides/umbrel/bitcoin-knots-reconstruction.png)

![Bitcoin Knots settings search in Umbrel showing the block max size and block max weight fields](/images/guides/umbrel/bitcoin-knots-blockmax.png)

After changing any Knots values, restart Bitcoin Knots and make sure it comes back cleanly before you move on.

## 4. Configure DATUM before you test anything

Two details matter immediately:

- DATUM does not fully initialize until you add your Bitcoin payout address in the app's `Config` tab
- Safari currently cannot be used to change DATUM settings there, so use another browser

If you need the in-app credentials to change settings, right-click the DATUM app icon on the Umbrel home screen and choose `Show default credentials`.

![DATUM Gateway config screen in Umbrel showing the Bitcoin Address field and optional Coinbase Tag field](/images/guides/umbrel/datum-config.png)

## 5. Find the Umbrel box IP on your local network

You can find the box IP in `Settings` on the umbrelOS home screen.

![Umbrel home screen showing the Settings app](/images/guides/umbrel/umbrel-open-settings.png)

![Umbrel settings screen showing the local IP field for the box on the home network](/images/guides/umbrel/umbrel-settings-local-ip.png)

On your local network, DATUM listens on:

```text
stratum+tcp://your-umbrel-lan-ip:23334
```

That local address is useful for checking that DATUM is up, but it is not what Braiins should use from outside your house.

## 6. Forward port 23334 from your router to Umbrel

Set a router port forward so inbound TCP traffic on port `23334` goes to the Umbrel machine on port `23334`.

The important part is that the forward targets the Umbrel box running DATUM, not the wrong machine on your network.

The screenshots below are example ASUS router screens. Your router UI will look different, but look for similar wording such as `Port Forwarding`, `Virtual Server`, `NAT`, `LAN`, or `DHCP`.

![Example router port forwarding screen showing where to forward TCP port 23334 to the Umbrel machine](/images/guides/umbrel/router-port-forward-example.png)

If your router lets you reserve DHCP leases, it is worth pinning the Umbrel box to one local IP so the forward does not silently break later.

![Example router DHCP reservation screen showing how to pin the Umbrel box to one local IP](/images/guides/umbrel/router-dhcp-reservation-example.png)

- make the forward TCP-only, not TCP+UDP
- if your router or firewall supports it, restrict allowed source IP ranges instead of exposing the port broadly
- avoid enabling broad UPnP auto-exposure for this service, and disable any automatic rule that opens `23334` wider than intended

## 7. Point Braiins at the endpoint you actually expose

For Braiins, this needs to be a stable public endpoint, not just whatever home IP you happen to have right now.

Reminder: Braiins will not let you change the stratum target inside an existing bid. Do not use a raw dynamic home IP here.

### 7a. If your router supports DDNS

Most home connections do not have a stable public IP, and many routers support DDNS with a simple hostname setup.

If you have that configured, Braiins should use the hostname on port `23334`:

```text
stratum+tcp://hostname.domain.com:23334
```

Replace `hostname.domain.com` with the actual DDNS hostname your router keeps updated.

![Example router DDNS screen showing a hostname configured for dynamic DNS](/images/guides/umbrel/router-ddns-example.png)

Before proceeding, verify from a network outside your home LAN that `hostname.domain.com:23334` accepts connections.

Simple ways to check include using a remote machine, an online port-check tool such as YouGetSignal, or running a remote test such as `telnet hostname.domain.com 23334` or `curl telnet://hostname.domain.com:23334`.

Here is an example of the kind of port-check interface you can use:

![Example open port checker showing the kind of tool you can use to verify the forwarded port is reachable](/images/guides/umbrel/open-port-check-example.png)

If the check fails, fix your DDNS or port-forwarding setup before moving on.

### 7b. If your ISP gives you a stable static public IP

If your home connection really does have a stable static public IP and you are intentionally using that instead of DDNS, Braiins can use it on port `23334`:

```text
stratum+tcp://your-public-ip:23334
```

Replace `your-public-ip` with the actual stable static public IP of your home connection.

If your ISP changes that IP, stop and fix the endpoint before spending more sats on Braiins.

## 8. What you bring into Braiins

When this guide is done, bring one of these public endpoints into the shared Braiins guide:

- `stratum+tcp://hostname.domain.com:23334`
- `stratum+tcp://your-public-ip:23334`

Use the Bitcoin address receiving OCEAN rewards as the username, optionally followed by a worker name after a period:

```text
bc1qyourrealbitcoinaddress.someworkername
```

Leave the password blank unless Braiins insists on one.

Then continue here:

<https://rentsomehash.com/guides/braiins-ocean/>

Before funding Braiins, you can also run the [hashpower calculator](/calculator/) to compare the estimate against buying BTC outright.

## Why use this guide

- You already have an Umbrel box you trust, so you can reuse it instead of building a separate VPS stack
- DATUM on Umbrel already sits on top of Bitcoin Knots and speaks Stratum on port `23334`
- Port forwarding keeps the setup simple if your goal is just to make DATUM reachable by Braiins
- The node and DATUM stay on hardware you already control, which is the entire reason to take this route
