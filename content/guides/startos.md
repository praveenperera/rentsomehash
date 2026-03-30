---
title: "StartOS alternative with Start Tunnel"
description: "Use this route if you already run StartOS and would rather point Braiins at your home setup through Start Tunnel."
slug: startos
order: 2
kind: alternative
summary: "Reuse an existing StartOS setup, install the right packages, and route Braiins through Start Tunnel."
eyebrow: "Alternative route"
featured: false
updated: "2026-03-29"
---

## When this route makes sense

Use this route if you already run StartOS 0.4.0, or if you would rather mine through hardware at home than build a fresh VPS box just for DATUM.

There are two broad ways to expose the service:

- Forward a port from your router and give Braiins your home IP
- Use Start Tunnel and let it front the service for you

The second option is usually the better one.

## Why Start Tunnel is the cleaner route

Start Tunnel acts like a router in the sky.

It forwards traffic to your home over VPN, gives you a stable public endpoint, and saves you from depending on whatever dynamic IP your home connection happens to have this week.

It also means you do not have to hand Braiins your literal home IP unless you want to.

## 1. Install BIP-110 on StartOS

Grab the latest release here:

<https://github.com/dathonohm/knots-startos/releases>

Install that package on your StartOS box.

## 2. Install the DATUM gateway

Install the DATUM gateway from the Start9 marketplace.

Once it is installed, make sure it is the service you are actually exposing to Braiins, not some other node endpoint by accident.

## 3. Set up Start Tunnel

Get a VPS and install Start Tunnel using the official docs:

<https://docs.start9.com/start-tunnel/1.0.x/>

Then follow the Start9 instructions to make your DATUM gateway use Start Tunnel.

## 4. Point Braiins at the tunnel endpoint

When Start Tunnel is in front of the gateway, Braiins should use:

```text
stratum+tcp://your-vps-ip:23334
```

Replace `your-vps-ip` with the public IP of the VPS running Start Tunnel.

## 5. If you skip Start Tunnel

If you choose to forward a port directly from your router to the StartOS machine instead, the pool URL points at the StartOS box on your local network.

It will look something like:

```text
stratum+tcp://192.168.x.y:23334
```

Replace the private IP with the actual address of the StartOS machine.

This works, but it is the less pleasant route.

## What stays the same from the main guide

The Braiins side does not really change:

- Create the account
- Do the Telegram verification
- Fund the account with BTC
- Create the bid
- Enter the correct mining pool URL
- Use the correct pool username format for your DATUM setup

If you need the exact Braiins field-by-field guidance, use the main guide alongside this one:

<https://rentsomehash.com/guides/braiins-ocean/>
