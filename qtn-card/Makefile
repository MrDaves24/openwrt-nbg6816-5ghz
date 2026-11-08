# The tooling for the Zyxel NBG6816's 5 GHz card (nbg6816-5ghz-explained.md): the qtn-card command,
# the card hook it installs on the card, host0 in the LAN, and wifi-to-5ghz.

include $(TOPDIR)/rules.mk

PKG_NAME:=qtn-card
PKG_VERSION:=1
PKG_RELEASE:=1
PKG_LICENSE:=GPL-2.0-only

include $(INCLUDE_DIR)/package.mk

define Package/qtn-card
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Tools for the Zyxel NBG6816's 5 GHz card
  DEPENDS:=@TARGET_ipq806x +kmod-qdpc-host
endef

define Package/qtn-card/description
  qtn-card shows the state of the NBG6816's Quantenna 5 GHz card, runs commands on it, and
  installs on its flash a hook that closes its root access. The package also puts host0, the
  link to the card, into br-lan, and moves the 2.4 GHz clients onto 5 GHz once after each boot.
endef

define Build/Compile
	$(TARGET_CC) $(TARGET_CFLAGS) $(TARGET_LDFLAGS) -Wall -Werror \
		-o $(PKG_BUILD_DIR)/qtn-card-crypt $(PKG_BUILD_DIR)/qtn-card-crypt.c
endef

define Package/qtn-card/install
	$(INSTALL_DIR) $(1)/usr/sbin $(1)/usr/libexec $(1)/usr/share/qtn-card \
		$(1)/etc/init.d $(1)/etc/uci-defaults $(1)/lib/upgrade/keep.d
	$(INSTALL_BIN) ./files/qtn-card $(1)/usr/sbin/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/qtn-card-crypt $(1)/usr/libexec/
	$(INSTALL_DATA) ./files/tweak_qcomm $(1)/usr/share/qtn-card/
	$(INSTALL_BIN) ./files/wifi-to-5ghz $(1)/usr/sbin/
	$(INSTALL_BIN) ./files/wifi-to-5ghz.init $(1)/etc/init.d/wifi-to-5ghz
	$(INSTALL_DATA) ./files/qtn-card.defaults $(1)/etc/uci-defaults/95-qtn-card
	$(INSTALL_DATA) ./files/qtn-card.keep $(1)/lib/upgrade/keep.d/qtn-card
endef

$(eval $(call BuildPackage,qtn-card))
