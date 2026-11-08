/*
 * Hashes the password read from stdin as MD5-crypt ($1$), for the 5 GHz card's /etc/shadow: its
 * uClibc knows only that scheme and DES, and neither the card's busybox nor the router's has a
 * tool to make one.
 */
#include <crypt.h>
#include <stdio.h>
#include <string.h>

int main(void)
{
	static const char set[] = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	char pass[256], salt[] = "$1$........";
	unsigned char r[8];
	const char *hash;
	FILE *f;
	size_t i;

	f = fopen("/dev/urandom", "r");
	if (!f || fread(r, 1, sizeof(r), f) != sizeof(r))
		return 1;
	fclose(f);
	for (i = 0; i < sizeof(r); i++)
		salt[3 + i] = set[r[i] % 64];
	if (!fgets(pass, sizeof(pass), stdin))
		return 1;
	pass[strcspn(pass, "\n")] = 0;
	hash = crypt(pass, salt);
	if (!hash || strncmp(hash, salt, sizeof(salt) - 1))
		return 1;
	puts(hash);
	return 0;
}
