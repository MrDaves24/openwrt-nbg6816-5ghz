# 5 GHz on the Zyxel NBG6816 under OpenWrt

The Zyxel NBG6816 (Armor Z1) has its 5 GHz radio on a Quantenna QSR1000 card, which upstream
OpenWrt doesn't support: the card runs a system of its own, loaded by the router at every boot,
and as it ships it is open as root to its whole network. This repo is an OpenWrt package feed that
gets it working and closes it:

- **`kmod-qdpc-host`**: Quantenna's GPL PCIe host driver, ported to Linux 6.18. It boots the card
  and links it to the router as `host0`.
- **`qtn-card`**: the `qtn-card` command (the card's state, commands on it, changing its network,
  and `install`, which puts a hook on the card's flash closing its root access), `host0` in the
  LAN, and `wifi-to-5ghz`, which moves the 2.4 GHz clients onto 5 GHz once after each boot.
- **`luci-app-qtn-card`**, optional: a LuCI page for the card, under Network → 5 GHz: its state, its
  SSID, key and channel, and its radio.

The card system, `topaz-linux.lzma.img`, isn't here: it has no redistribution licence. Each owner
takes it from their router's stock firmware, through the install's backup.

- **[The tutorial](nbg6816-5ghz.md)**: from OpenWrt on the router to 5 GHz on air.
- **[The explanation](nbg6816-5ghz-explained.md)**: how the card works, why it needs closing, and
  the limits.

Add the feed to an OpenWrt build tree with:

```
src-git nbg6816_5ghz https://github.com/MrDaves24/openwrt-nbg6816-5ghz.git
```

The device itself is OpenWrt's (pull request
[#26552](https://github.com/openwrt/openwrt/pull/26552)); installing it from the stock firmware:
[openwrt-nbg6816-install](https://github.com/MrDaves24/openwrt-nbg6816-install).

## License

The code is GPL-2.0-only ([LICENSE](LICENSE)); the driver is Quantenna's, GPL-2.0-or-later. The
two articles are under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
