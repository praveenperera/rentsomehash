---
title: "Braiins to OCEAN on a fresh DATUM box"
description: "The fastest route: rent a Linux VPS, install the combined node + DATUM box, wait for sync, then point Braiins hashpower at it."
slug: braiins-ocean
order: 1
kind: primary
summary: "Fresh Linux VPS workflow for bringing up a node, running DATUM, and creating the Braiins bid correctly."
navLabel: "Main guide"
routeType: "Fresh VPS workflow"
eyebrow: "Main route"
featured: true
updated: "2026-03-29"
---

## The route

This is the route to use if you want the cleanest setup and do not already have a node wired to DATUM.

You are building what is effectively a dedicated datum box: one Linux machine that runs the node and DATUM together. The chain sync still takes time, but the pieces fit together right out of the gate.

If you already have a node, you can point DATUM to that instead if you know how.

## What you need first

- A machine you will use to manage the setup, usually your normal laptop
- A Linux VPS from a provider such as [Bitlaunch](https://bitlaunch.io)
- An SSH keypair for the machine you manage from
- A Bitcoin address you control for `POOL_ADDRESS`
- BTC ready to fund your Braiins account

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

## 6. Fund Braiins

Create a Braiins hashpower account here:

<https://hashpower.braiins.com/>

![Braiins homepage showing where to create a hashpower account](/images/guides/braiins-ocean/braiins-signup.png)

Then do the Telegram verification they require, and send BTC to the deposit address they give you.

![Braiins account page showing where to find the deposit BTC address](/images/guides/braiins-ocean/braiins-deposit-address.png)

## 7. Create the bid

Once the box is ready and Braiins is funded, create the bid.

![Braiins create bid dialog showing the main fields for price, budget, pool URL, and pool username](/images/guides/braiins-ocean/braiins-create-bid.png)

### Price and budget

You can start with Braiins' suggested pricing using **Use** or **Use max**, then use your own judgment from there.

You obviously do not want to be paying exorbitant amounts.

### Speed limit

The higher the speed limit, the faster you'll burn through your sats.

The faster you burn through sats, the more variance you will suffer. That can go your way or not. Choice is yours.

### Mining pool URL

Point Braiins to your DATUM box like this:

```text
stratum+tcp://your-vps-ip:23334
```

Do not include backticks or angle brackets. Replace `your-vps-ip` with the actual VPS IP.

### Pool username

With the default DATUM settings, the username wants to look like this:

```text
bc1qyourrealbitcoinaddress.someworkername
```

> If you want to obscure your Bitcoin address from Braiins here, you can change DATUM's `pool_pass_full_users` setting to `false` and restart DATUM. Braiins are still perfectly capable of figuring this out though, so it's a LARP as far as any OPSEC is concerned.

If you do that, rewards go to the `POOL_ADDRESS` you set during the installer. That is why the guide keeps hammering on using an address you control.

## 8. Confirm the bid

Create the bid and confirm it in Telegram.

That is it for the main route.

## What success looks like

At the end of this flow:

- The VPS is running your node and DATUM together
- The node is synced
- Braiins is pointed at `stratum+tcp://your-vps-ip:23334`
- The pool username matches the DATUM behavior you chose
- The bid is funded and confirmed

If one of those is not true yet, the guide is not done.

## Why use this route

- This is the cleanest route if you do not already run a node and just want to get from zero to a working DATUM box
- The node and DATUM live together on one machine, which avoids a lot of cross-box networking mistakes
- Braiins only needs one public IP and port, so the pool URL side stays simple
- Troubleshooting is easier because the whole stack is in one place instead of split across home hardware and a tunnel
- If you support BIP-110, selecting that option in the installer lets you point rented hash at a box running that build
