include $(TOPDIR)/rules.mk

PKG_VERSION:=1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only

LUCI_TITLE:=LuCI page for the Zyxel NBG6816's 5 GHz card
LUCI_DEPENDS:=+luci-base +qtn-card
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
