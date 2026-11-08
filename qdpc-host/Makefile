# Quantenna's PCIe host driver for the 5 GHz card of the Zyxel NBG6816: it boots the card with
# the card system and gives the router a virtual Ethernet link to it, host0.
# The card system isn't here: it has no redistribution licence. The driver asks for
# /lib/firmware/topaz-linux.lzma.img, taken from the router's own stock firmware (nbg6816-5ghz.md).

include $(TOPDIR)/rules.mk
include $(INCLUDE_DIR)/kernel.mk

PKG_NAME:=qdpc-host
PKG_VERSION:=37.3.2.44
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-or-later

include $(INCLUDE_DIR)/package.mk

define KernelPackage/qdpc-host
  SUBMENU:=Wireless Drivers
  TITLE:=Quantenna QSR1000 PCIe host driver
  DEPENDS:=@TARGET_ipq806x
  FILES:=$(PKG_BUILD_DIR)/host/arm/qdpc-host.ko
  AUTOLOAD:=$(call AutoProbe,qdpc-host)
endef

define KernelPackage/qdpc-host/description
  Boots the Quantenna QSR1000 5 GHz card of the Zyxel NBG6816 over PCIe and links it to the
  router as host0. Needs the card system in /lib/firmware/topaz-linux.lzma.img.
endef

define Build/Compile
	$(KERNEL_MAKE) M="$(PKG_BUILD_DIR)/host/arm" modules
endef

$(eval $(call KernelPackage,qdpc-host))
