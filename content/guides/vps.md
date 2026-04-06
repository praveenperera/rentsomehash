---
title: "Fresh VPS node setup for DATUM"
description: "Use this if you want the cleanest setup: rent a Linux VPS, install the combined node + DATUM box, wait for sync, then continue to the shared Braiins guide."
slug: vps
order: 1
stage: node
summary: "Rent a Linux VPS, install the combined node + DATUM box, and get a public DATUM endpoint ready for Braiins."
navLabel: "VPS"
setupType: "Fresh VPS setup"
eyebrow: "Step 1: Node setup"
featured: true
updated: "2026-04-06"
---

## When this guide makes sense

Use this if you want the cleanest setup and do not already have a node wired to DATUM.

You are building what is effectively a dedicated datum box: one Linux machine that runs the node and DATUM together. The chain sync still takes time, but the pieces fit together right out of the gate.

## What you need first

- A machine you will use to manage the setup, usually your normal laptop
- A Linux VPS from a provider such as [Bitlaunch](https://bitlaunch.io)
- An SSH keypair for the machine you manage from
- A Bitcoin address you control for `POOL_ADDRESS`

## 1. Generate an SSH keypair

Generate an SSH keypair on the machine you will use to manage everything.

If you need a refresher, use Start9's SSH guide:

<https://docs.start9.com/0.3.5.x/user-manual/ssh.html>

## 2. Rent the VPS

Rent the VPS and paste your SSH public key into the provider's setup flow so you can log in without fighting passwords later.

Once the machine is up, SSH in:

```bash
ssh root@your-vps-ip
```

Then become root if you are not already:

```bash
sudo -i
```

## 3. Install the datum box

Run the setup exactly from the repository below:

```bash
apt update && apt upgrade
apt install git -y
git clone https://github.com/BitcoinMechanic/OC-mech-datum-boxes/tree/add-110-option
cd OC-mech-datum-boxes
git checkout 0.3-dev
./main.sh
```

## 4. Answer the installer

The script asks a lot of questions.

Use these instructions while you work through them:

<https://github.com/BitcoinMechanic/datum-setup-instructions>

The short version is simple:

- You can accept the default for basically everything
- `POOL_ADDRESS` is the one field you must set carefully
- `POOL_ADDRESS` must be a valid Bitcoin address you control
- If this is a VPS, pruning to `550` is the sensible choice

> If you are renting a VPS, almost nobody doing this guide wants to pay for archival-node storage. Pruning to `550` is the default for a reason.

> If you selected BIP-110 in the installer, that is what the box is running.

## 5. Wait for the node to sync

That finishes the install, but you still need to wait for the chain to sync.

You can follow progress with:

```bash
journalctl -u bitcoin_knots.service -f
```

Do not rush this part. Getting the box online is the slowest step in the whole process.

## What you bring into Braiins

Once this guide is done, bring these values into the shared Braiins guide:

- Mining pool URL: `stratum+tcp://your-vps-ip:23334`
- Pool username: `bc1qyourrealbitcoinaddress.someworkername`
- Reward destination: the `POOL_ADDRESS` you chose during install

Then continue here:

<https://rentsomehash.com/guides/braiins-ocean/>

## Why use this guide

- This is the cleanest route if you do not already run a node and just want to get from zero to a working DATUM box
- The node and DATUM live together on one machine, which avoids a lot of cross-box networking mistakes
- Braiins only needs one public IP and port after this, so the shared Braiins guide stays simple
