---
title: How the Zyxel NBG6816's 5 GHz card works under OpenWrt
slug: nbg6816-5ghz-explained
date: 2026-11-08
updated: 2026-11-08
summary: The NBG6816's Quantenna card is a computer of its own, open to its network as it ships; how OpenWrt boots it, links it, and closes it.
tags: [openwrt, zyxel-nbg6816, quantenna, wifi, explanation]
---

# How the Zyxel NBG6816's 5 GHz card works under OpenWrt

The [tutorial](nbg6816-5ghz.md) gets the card on air. This is why it takes the steps it does.

## The card is a computer

The 5 GHz radio is a Quantenna QSR1000 on the router's first PCIe controller (PCI ID `1bb5:0008`).
It isn't a Wi-Fi chip the router drives: it has an ARC CPU of its own, runs Linux 2.6.35 with
BusyBox, and runs hostapd itself. The router only gives it a network link. That's why OpenWrt's
wireless configuration, `wifi` and LuCI's wireless pages don't see it, and why no upstream driver
exists: there is nothing for mac80211 to drive.

The card has a flash of its own: a bootloader, two environments, two system partitions and a
small jffs2, `data`, mounted on the card at `/mnt/jffs2`. That jffs2 holds what the card keeps
across boots: its address (`223.254.253.252`), its MAC addresses, and its network settings
(`wireless_conf.txt`, `hostapd.conf`). Its radio calibration and regulatory tables are in its
bootloader's store. So the card comes up under OpenWrt with the 5 GHz network your stock firmware
last set, and `sysupgrade` never touches any of it.

Its region is fixed at `eu`: the card refuses to change it. Its tables give 20 dBm on the upper
channels (100 and up) against 13 on channel 36.

## How it boots

The system partitions on the card's flash hold an old card system, from 2014, but the card never
boots it: at every boot its loader asks the host for one over PCIe. The router answers with
`topaz-linux.lzma.img`, Quantenna's card system that Zyxel's firmware shipped in
`/lib/firmware`. It has no redistribution licence, which is why each owner takes it from their own
stock firmware.

The host side is Quantenna's GPL driver, `qdpc-host` (v37.3.2.44), from Lean's
`coolsnowwolf/lede`, ported here to Linux 6.18. The first commit of this repo is the driver as
Lean's tree has it; `git diff` from there shows the port. The driver maps the card's three PCIe
regions, sets up two descriptor rings, and registers `host0`, a virtual Ethernet port over PCIe.
A kernel thread then walks the card's boot protocol: the card asks for the file, the driver
copies it in 1 MB blocks, and the card reports its boot about 9 s later.

On the card, `br0` bridges its end of `host0` and its radio. On the router, `qtn-card` puts `host0`
into `br-lan`, with `223.254.253.251` on the bridge to reach the card. The card's Wi-Fi clients are
then on your LAN.

## Why it needs closing

As the card system ships, everything on the card's `br0` is open to every LAN client, through
`host0`, and to every 5 GHz client, which sits on that bridge and never crosses the router's. No
firewall on the router can protect it:

- telnet as root with no password (and `admin`, also uid 0, with none either);
- Quantenna's RPC servers over TCP, with portmap on 111: no authentication and no setting to turn
  them off, and root-equivalent (any `call_qcsapi` command, files and flash written, telnet turned
  back on). They restart 20 s after they exit;
- a PHP web UI as root on port 80, with `admin/admin`, also on 443 and on IPv6: the card takes
  global IPv6 addresses from your router's advertisements, so the web UI may be reachable from
  the internet;
- hostapd's WPS UPnP listener.

Zyxel's firmware shipped it that way. `qtn-card install` closes it with the card's own mechanism:
at every boot, the card runs `/mnt/jffs2/tweak_qcomm` from its flash, in the background, before
its RPC servers and web UI start. The hook `qtn-card` installs there turns IPv6 off on the card's
`br0` (its own addresses only; its clients' IPv6 crosses the bridge as before), sets root's
password and locks `admin` and `default` (the card's `/etc` is rebuilt at each boot, so the hook
does it every time), then waits for the RPC servers and stops the TCP ones, with portmap. The RPC
servers over PCIe stay, reachable from the router only. A flag file in the jffs2 turns the web UI
off, and WPS goes off in the card's settings, which ends the UPnP listener. Telnet stays, behind
the password: it is how `qtn-card` manages the card, and the router has no client for the PCIe RPC.

What stays open: the hook only runs once the card has started, so for a few seconds at each boot
the card is as it ships, until the hook has set the password and stopped the RPC servers. A UDP
socket of the card's kernel on port 49300 stays too, unidentified: no process holds it, and the
card's modules don't name it.

Neither the card's BusyBox nor OpenWrt's has a tool to hash a password, and the card's C library
knows only MD5-crypt and DES: `qtn-card` carries a small helper that makes the `$1$` hash.

## Why clients stay on 2.4 GHz

The 2.4 GHz radio is on air about 20 s after boot; the card about 34 s, plus a 60 s radar check
before it may transmit on the upper channels (DFS). Every client joins 2.4 GHz first, and with one
SSID on both bands it has no reason to move. `wifi-to-5ghz` disconnects every 2.4 GHz client once,
three minutes after boot, if `host0` is up: they choose again, and take 5 GHz where they hear it.
One that hears it badly comes back to 2.4 GHz.

A change of the 5 GHz network does the same thing to its clients: the card's hostapd reloads, they
drop, land on 2.4 GHz and stay. So `qtn-card set`, which the LuCI page uses too, runs the same move
90 seconds after such a change, long enough for the card's radar check; sooner, the clients find no
5 GHz network yet and go back to 2.4 GHz.

## Limits

- The driver can't be reloaded. Unloading it resets the card, its PCIe link drops, and the
  controller trains its link only at boot, so the next probe fails. Only a reboot brings the card
  back.
- If the card resets on its own, the driver logs it and leaves 5 GHz down until the next reboot.
  Quantenna's code rebooted the router instead.
- The link runs at PCIe Gen 1 (2.5 GT/s); the card could do Gen 2.
- `host0` gets a random MAC at each load, unless the module's `ethaddr` parameter sets one.
- The card's `iwconfig` reports 0 dBm whatever the power: `call_qcsapi get_tx_power wifi0
  <channel>` gives the real one.
- The radar check delays 5 GHz by a minute at every boot on the upper channels.
- The card's `rfenable 1` copies its default `hostapd.conf` over the one on its flash, which erases
  your SSID and key. `qtn-card set` turns the radio on without it, and keeps it off across boots with
  the card's `start_down` setting.
- What's proven, on one unit used as an access point: the card booting and serving clients, both
  radios at once, reboots with the driver loaded at boot. Not tried: a router in its default
  routing mode. Not measured: throughput, both radios under load, weeks of uptime.

The Netgear R7500 v1 reportedly carries the same card; this repo is untried there.

---

This article is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the code in this
repo is under GPL-2.0.
