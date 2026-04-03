---
title: "Umbrel route with router port forwarding"
description: "Use this route if you already run Umbrel and would rather reuse that box than build a fresh VPS around DATUM."
slug: umbrel
order: 3
kind: alternative
summary: "Reuse an existing Umbrel setup, install Bitcoin Knots and DATUM, then forward port 23334 from your router to Braiins."
navLabel: "Umbrel"
routeType: "Existing Umbrel setup"
eyebrow: "Home node route"
featured: false
updated: "2026-04-02"
---

## When this route makes sense

Use this route if you already run Umbrel and want to keep the node and DATUM on hardware you already trust.

This is the simpler Umbrel version of the home node workflow:

- Install Bitcoin Knots on Umbrel
- Install DATUM on Umbrel
- Configure DATUM correctly
- Forward port `23334` from your router to the Umbrel box
- Give Braiins your public IP on that port

## Why port forwarding is the straightforward route here

On Umbrel, DATUM listens on port `23334`.

On your local network, miners point at the Umbrel box IP directly. For Braiins, you need that same DATUM port reachable from the internet, so the straightforward route is to forward `23334` from your router to the Umbrel machine.

That keeps the setup simple and avoids turning this guide into a separate tunnel guide.

## 1. Install Bitcoin Knots on Umbrel

Install Bitcoin Knots from the Umbrel App Store:

<https://apps.umbrel.com/app/bitcoin-knots>

The Knots app includes BIP-110 in the version selector, so if you want that build, select the BIP-110 version in the app settings.

If your box is still syncing, let that finish before you try to use DATUM for anything serious.

## 2. Install DATUM on Umbrel

Install DATUM from the Umbrel App Store:

<https://apps.umbrel.com/app/datum>

DATUM depends on Bitcoin Knots and connects to it automatically after installation.

## 3. Configure DATUM before you test anything

Two details matter immediately:

- DATUM does not fully initialize until you add your Bitcoin payout address in the app's `Config` tab
- Safari currently cannot be used to change DATUM settings there, so use another browser

If you need the in-app credentials to change settings, right-click the DATUM app icon on the Umbrel home screen and choose `Show default credentials`.

## 4. Find the Umbrel box IP on your local network

You can find the box IP in `Settings` on the umbrelOS home screen.

On your local network, DATUM listens on:

```text
stratum+tcp://your-umbrel-lan-ip:23334
```

That local address is useful for checking that DATUM is up, but it is not what Braiins should use from outside your house.

## 5. Forward port 23334 from your router to Umbrel

Set a router port forward so inbound TCP traffic on port `23334` goes to the Umbrel machine on port `23334`.

The important part is that the forward targets the Umbrel box running DATUM, not the wrong machine on your network.

If your router lets you reserve DHCP leases, it is worth pinning the Umbrel box to one local IP so the forward does not silently break later.

## 6. Point Braiins at the endpoint you actually expose

There are two reasonable ways to do this once the port forward is live.

### 6a. If your router supports DDNS

Most home connections do not have a stable public IP, and many routers support DDNS with a simple hostname setup.

If you have that configured, Braiins should use the hostname on port `23334`:

```text
stratum+tcp://hostname.domain.com:23334
```

Replace `hostname.domain.com` with the actual DDNS hostname your router keeps updated.

### 6b. If you are using the raw public IP

If you are not using DDNS, Braiins should use your public home IP on port `23334`:

```text
stratum+tcp://your-public-ip:23334
```

Replace `your-public-ip` with the actual public IP of your home connection.

If your ISP changes that IP, Braiins will need the new one.

## 7. Use the right Braiins pool username

Use the Bitcoin address receiving OCEAN rewards as the username, optionally followed by a worker name after a period.

It should look like:

```text
bc1qyourrealbitcoinaddress.someworkername
```

Leave the password blank unless Braiins insists on one.

## What stays the same from the main guide

The Braiins side is still the same:

- Create the account
- Do the Telegram verification
- Fund the account with BTC
- Create the bid
- Enter the correct mining pool URL
- Use the correct pool username format for your DATUM setup

If you need the exact Braiins field-by-field guidance, use the main guide alongside this one:

<https://rentsomehash.com/guides/braiins-ocean/>

## Why use this route

- You already have an Umbrel box you trust, so you can reuse it instead of building a separate VPS stack
- DATUM on Umbrel already sits on top of Bitcoin Knots and speaks Stratum on port `23334`
- Port forwarding keeps the setup simple if your goal is just to make DATUM reachable by Braiins
- The node and DATUM stay on hardware you already control, which is the entire reason to take this route
