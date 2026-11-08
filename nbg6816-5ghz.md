---
title: 5 GHz Wi-Fi on the Zyxel NBG6816 under OpenWrt
slug: nbg6816-5ghz
date: 2026-11-08
updated: 2026-11-08
summary: Get the NBG6816's Quantenna 5 GHz card working under OpenWrt, with its root access closed.
tags: [openwrt, zyxel-nbg6816, quantenna, wifi, tutorial]
---

# 5 GHz Wi-Fi on the Zyxel NBG6816 under OpenWrt

The NBG6816 (Armor Z1) has its 5 GHz radio on a Quantenna card that OpenWrt doesn't support: the
card runs a system of its own, which the router loads into it at every boot. With the two packages
of this repo and that system, taken from your router's stock firmware, OpenWrt gets the card on
air. How it works, and why the card needs closing: [the explanation](nbg6816-5ghz-explained.md).

## What you need

- An NBG6816 running OpenWrt, installed with the
  [install guide](https://github.com/MrDaves24/openwrt-nbg6816-install), and the
  `nbg6816-stock.tar` its backup step saved on your PC. The card system comes only from there:
  Zyxel no longer publishes the firmware, and this repo can't ship it.
- The OpenWrt build tree your image was built from, or, once an OpenWrt release supports the
  NBG6816, that release's SDK. The driver must be built for the exact kernel your router runs.
- On the PC, `unsquashfs` from squashfs-tools 4.5 or later (`squashfs-tools` on Debian and
  Ubuntu, `squashfs` in Homebrew).

The commands use `192.168.1.1`, OpenWrt's default address: use your router's.

## 1. Take the card system out of the backup

On the PC, where `nbg6816-stock.tar` is:

```sh
tar xf nbg6816-stock.tar stock-firmware.bin
unsquashfs -o 4325376 -d stock stock-firmware.bin lib/firmware/topaz-linux.lzma.img
sha256sum stock/lib/firmware/topaz-linux.lzma.img
```

The stock root filesystem starts 4325376 bytes into the backup. From firmware V1.00(AAWB.12)C0,
the file's sha256 is
`eaf13c752901325a90f57592d05703ef0997af367c904d5e452163eb72b0cfbd`.

## 2. Build the packages

In the build tree (or the SDK), add this repo as a feed and build its two packages:

```sh
[ -f feeds.conf ] || cp feeds.conf.default feeds.conf
echo 'src-git nbg6816_5ghz https://github.com/MrDaves24/openwrt-nbg6816-5ghz.git' >>feeds.conf
./scripts/feeds update nbg6816_5ghz
./scripts/feeds install -p nbg6816_5ghz -a
printf '%s\n' CONFIG_PACKAGE_kmod-qdpc-host=m CONFIG_PACKAGE_qtn-card=m >>.config
make defconfig
make package/qdpc-host/compile package/qtn-card/compile
```

They land in `bin/targets/ipq806x/generic/packages/kmod-qdpc-host-*.apk` and
`bin/packages/*/nbg6816_5ghz/qtn-card-*.apk`.

If your router has LuCI and you want a page for the card in it, build a third package, which lands
beside `qtn-card`, and copy and install it with the others in step 3:

```sh
./scripts/feeds update luci
./scripts/feeds install -p nbg6816_5ghz -a
echo CONFIG_PACKAGE_luci-app-qtn-card=m >>.config
make defconfig
make package/luci-app-qtn-card/compile
```

If you build your own images, you can instead set both lines to `=y` before building the image:
the packages are then in it, and stay through every `sysupgrade`. In step 3, only the card system
is copied then, and there is no `apk add`.

## 3. Install them

Copy the card system and the two packages to the router:

```sh
scp -O stock/lib/firmware/topaz-linux.lzma.img \
  bin/targets/ipq806x/generic/packages/kmod-qdpc-host-*.apk \
  bin/packages/*/nbg6816_5ghz/qtn-card-*.apk root@192.168.1.1:/tmp/
```

Then on the router (`ssh root@192.168.1.1`):

```sh
mv /tmp/topaz-linux.lzma.img /lib/firmware/
apk add --allow-untrusted /tmp/kmod-qdpc-host-*.apk /tmp/qtn-card-*.apk
reboot
```

The card system has to be in place first: the driver loads it into the card as soon as it starts.

## 4. Close the card's root access

About two minutes after the reboot, the card is on air. Until this step, anyone on your LAN or on
your 5 GHz network can log into it as root, with no password. On the router:

```sh
qtn-card install
```

It asks for a root password for the card, twice (8 characters or more). It keeps it in
`/etc/qtn-card.pass`, readable by root only, for the `qtn-card` command. Note it somewhere too:
after a reset or a `sysupgrade -n` that file is gone, `qtn-card install` asks for the password,
and there is no known way into the card without it. Then check:

```sh
qtn-card
```

It shows the card's state, and should say `login: asks for a password`, with none of the ports
111, 80 and 443 among those listening.

## 5. Your 5 GHz network

The card keeps the network settings your stock firmware last gave it, in its own flash: you likely
have your stock 5 GHz network back as it was. `qtn-card` says whether its SSID and key are the
same as your 2.4 GHz network's (it never prints them).

To change them, give `qtn-card set` the lines you want, any of them:

```sh
printf '%s\n' 'ssid=My network' 'key=my passphrase' channel=36 | qtn-card set
```

SSIDs are 1 to 32 printable ASCII characters and keys 8 to 63. A channel of `0` lets the card
choose. Changes apply at once and the card keeps them in its flash. They drop the 5 GHz clients,
and about 90 seconds later the router moves them back from 2.4 GHz. The card stays in the EU's
regulatory domain whatever you set: it can't be changed.

To turn the radio off, and on again:

```sh
echo radio=off | qtn-card set
echo radio=on | qtn-card set
```

It stays off across reboots until you turn it on. Don't run the card's own `rfenable 1`: it
replaces your network's SSID and key with the card system's defaults.

If you installed the third package, LuCI has all of this under **Network → 5 GHz**, with the card's
state. The page takes about 12 seconds to load, because the router logs into the card to read it.

The router disconnects its 2.4 GHz clients once, three minutes after each boot, so that clients
of a network with one SSID on both bands choose again and take 5 GHz where they hear it. To turn
that off: `/etc/init.d/wifi-to-5ghz disable`, again after each install of the package.

## After a sysupgrade

`sysupgrade` keeps the card system and the card's password, not the packages: install the
packages built with the new image (step 3's `apk add`, then `reboot`). The card keeps its hook and
its settings in its own flash: nothing to do on the card again. A `sysupgrade -n` or a reset keeps
neither file: copy the card system again (step 3), and `qtn-card install` asks for the password.

---

This article is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the code in this
repo is under GPL-2.0.
