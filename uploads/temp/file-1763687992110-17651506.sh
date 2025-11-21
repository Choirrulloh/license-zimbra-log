#!/bin/bash
set -e

echo "=== PRE-INSTALL & (OPTIONAL) DNS ZIMBRA SCRIPT ==="

# Ambil info OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS=$(uname -s)
fi

# Pilihan menu awal
echo
echo "Apakah Anda ingin install Zimbra lengkap dengan DNS internal?"
echo "1) Ya, install Zimbra (lab/POC/single server, butuh DNS internal)"
echo "2) Tidak, hanya initialize basic server (tanpa DNS/Zimbra)"
read -p "Pilih [1/2]: " ZIMBRA_OPT

# Tanya hostname, domain jika install Zimbra
if [ "$ZIMBRA_OPT" == "1" ]; then
    read -p "Masukkan domain Zimbra (misal: domain.com): " DOMAIN
fi

read -p "Masukkan FQDN hostname (misal: zimbra.domain.com): " FQDN

# Ambil interface utama (default gateway)
IFACE=$(ip route get 1.1.1.1 | awk '{print $5; exit}')
AUTO_IPADDR=$(ip -o -4 addr show dev $IFACE | awk '{print $4}' | cut -d/ -f1)

echo
echo "Terdeteksi interface utama: $IFACE, IP: $AUTO_IPADDR"
read -p "Gunakan IP di atas [$AUTO_IPADDR]? (tekan Enter jika ya, atau isi IP lain): " IPADDR
if [ -z "$IPADDR" ]; then
    IPADDR=$AUTO_IPADDR
fi

# Ekstrak alias dari FQDN (bagian paling kiri)
HOST_ALIAS=$(echo "$FQDN" | cut -d. -f1)

# Tanya port SSH (default 22 jika dikosongkan)
echo
read -p "Masukkan port SSH yang ingin digunakan [default 22]: " SSH_PORT
if [ -z "$SSH_PORT" ]; then
    SSH_PORT=22
fi

# Tanya password root (jika kosong, nanti di generate random, simpan flag)
echo
read -s -p "Password root yang diinginkan (biarkan kosong untuk auto-random): " ROOTPW_INPUT; echo
ROOTPW_RANDOM=""
SHOW_ROOTPW=0

if [ -z "$ROOTPW_INPUT" ]; then
    # Generate random password (strong, 8-15 chars)
    RANDLEN=$((8 + RANDOM % 8))
    # strong (A-Z a-z 0-9 special)
    ROOTPW_INPUT=$(tr -dc 'A-Za-z0-9!@#$%^&*_+=' < /dev/urandom | head -c $RANDLEN)
    ROOTPW_RANDOM="$ROOTPW_INPUT"
    SHOW_ROOTPW=1
fi

# --- FUNGSI: Basic Initialize ---
basic_initialize() {
    # 1. Nonaktifkan SELinux (Rocky/CentOS/Alma)
    if [ -f /etc/selinux/config ]; then
        echo "Menonaktifkan SELinux..."
        setenforce 0 2>/dev/null || true
        sed -i 's/^SELINUX=.*/SELINUX=disabled/' /etc/selinux/config
    fi

    # 2. Nonaktifkan Firewall (firewalld/ufw)
    if systemctl is-active --quiet firewalld; then
        systemctl stop firewalld
        systemctl disable firewalld
        echo "Firewalld dinonaktifkan."
    fi
    if systemctl is-active --quiet ufw; then
        ufw disable
        echo "UFW dinonaktifkan."
    fi

    # 3. Disable sendmail/postfix jika ada
    for svc in sendmail postfix; do
        if systemctl list-unit-files | grep -q "${svc}.service"; then
            systemctl stop $svc || true
            systemctl disable $svc || true
            echo "Service $svc dinonaktifkan."
        fi
    done

    # 4. Set Hostname & /etc/hosts
    hostnamectl set-hostname "$FQDN"
    echo "Hostname diubah menjadi $FQDN"
    if grep -q "$FQDN" /etc/hosts; then
        echo "Hostname sudah ada di /etc/hosts"
    else
        echo "$IPADDR $FQDN $HOST_ALIAS" >> /etc/hosts
        echo "/etc/hosts diupdate: $IPADDR $FQDN $HOST_ALIAS"
    fi

    # 5. Set timezone Asia/Jakarta
    timedatectl set-timezone Asia/Jakarta
    echo "Timezone diubah ke Asia/Jakarta"

    # 6. Install dependency dasar (tanpa BIND/DNS)
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        apt update
        apt install -y netcat-openbsd sudo libidn12 libpcre3 libgmp10 libexpat1 libstdc++6 libperl5.34 libaio1 resolvconf unzip pax sysstat sqlite3 net-tools
    elif [[ "$OS" == "rocky" || "$OS" == "centos" || "$OS" == "almalinux" ]]; then
        yum update -y
        yum install -y epel-release
        yum update -y
        yum upgrade -y
        yum -y install perl perl-core wget screen tar openssh-clients openssh-server dnsmasq unzip nmap sed nc sysstat libaio rsync telnet aspell net-tools rsyslog
    else
        echo "OS tidak dikenali, silakan install paket dependency secara manual."
        exit 1
    fi

    # 7. Konfigurasi SSH agar root bisa login dan port bisa custom
    SSHD_CONFIG="/etc/ssh/sshd_config"
    echo "Mengatur SSH agar root bisa login dan port: $SSH_PORT"
    [ ! -f "${SSHD_CONFIG}.bak" ] && cp $SSHD_CONFIG ${SSHD_CONFIG}.bak

    sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' $SSHD_CONFIG
    sed -i 's/^#\?Port.*/Port '"$SSH_PORT"'/' $SSHD_CONFIG
    if ! grep -q "^Port " $SSHD_CONFIG; then
        sed -i "1iPort $SSH_PORT" $SSHD_CONFIG
    fi
    if ! grep -q "^PermitRootLogin " $SSHD_CONFIG; then
        sed -i "/^Port /aPermitRootLogin yes" $SSHD_CONFIG
    fi

    systemctl restart sshd || systemctl restart ssh
    echo "Konfigurasi SSH selesai. Silakan tes login root dengan port $SSH_PORT."

    # 8. Set root password sesuai input/hasil random
    ROOT_HASH=$(getent shadow root | awk -F: '{print $2}')
    if [[ -z "$ROOT_HASH" || "$ROOT_HASH" =~ ^!* ]]; then
        echo "Mengatur password root sesuai input atau random..."
        echo "root:$ROOTPW_INPUT" | chpasswd
        echo "Password root sudah diatur."
    else
        echo "Root sudah punya password."
    fi

    echo "=== INITIALIZE SERVER SELESAI ==="
}

# --- FUNGSI: Install + Configure DNS/BIND untuk Zimbra ---
install_dns_zimbra() {
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        echo "Update & install package (Ubuntu/Debian)..."
        apt update
        apt install -y bind9 bind9utils netcat-openbsd sudo libidn12 libpcre3 libgmp10 libexpat1 libstdc++6 libperl5.34 libaio1 resolvconf unzip pax sysstat sqlite3 net-tools

        DNS_CONF="/etc/bind/named.conf.local"
        DNS_DIR="/etc/bind"
        DNS_OPTS="/etc/bind/named.conf.options"
        SERVICE_DNS="bind9"
        ZONE_OWNER="bind:bind"

    elif [[ "$OS" == "rocky" || "$OS" == "centos" || "$OS" == "almalinux" ]]; then
        echo "Update & install package (Rocky/CentOS/Alma)..."
        yum update -y
        yum install -y epel-release
        yum update -y
        yum upgrade -y
        yum -y install perl perl-core wget screen tar openssh-clients openssh-server dnsmasq bind bind-utils unzip nmap sed nc sysstat libaio rsync telnet aspell net-tools rsyslog

        DNS_CONF="/etc/named.conf"
        DNS_DIR="/etc/named"
        SERVICE_DNS="named"
        ZONE_OWNER="named:named"
    else
        echo "OS tidak dikenali, silakan install paket dependency secara manual."
        exit 1
    fi

    # Konfigurasi DNS Bind
    ZONEFILE="$DNS_DIR/db.$DOMAIN"
    cat > $ZONEFILE <<EOF
\$TTL    604800
@       IN      SOA     ns1.$DOMAIN. root.$DOMAIN. (
                         2         ; Serial
                    604800         ; Refresh
                     86400         ; Retry
                   2419200         ; Expire
                    604800 )       ; Negative Cache TTL
;
@       IN      NS      ns1.$DOMAIN.
ns1     IN      A       $IPADDR
$HOST_ALIAS     IN      A       $IPADDR
@       IN      MX 10   $HOST_ALIAS.$DOMAIN.
EOF

    chown $ZONE_OWNER $ZONEFILE

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        if ! grep -q "$DOMAIN" $DNS_CONF; then
            echo "zone \"$DOMAIN\" { type master; file \"$ZONEFILE\"; };" >> $DNS_CONF
        fi

        tee $DNS_OPTS > /dev/null <<EOF
options {
    directory "/var/cache/bind";

    forwarders {
        8.8.8.8;
        1.1.1.1;
    };

    dnssec-validation no;

    listen-on-v6 { any; };
};
EOF

        systemctl restart bind9
        sleep 2
        systemctl status bind9 --no-pager || true

    elif [[ "$OS" == "rocky" || "$OS" == "centos" || "$OS" == "almalinux" ]]; then
        if ! grep -q "$DOMAIN" $DNS_CONF; then
            echo "zone \"$DOMAIN\" IN { type master; file \"$ZONEFILE\"; };" >> $DNS_CONF
        fi

        systemctl restart named
        sleep 2
        systemctl status named --no-pager || true
    fi

    echo "DNS lokal (A & MX) untuk $DOMAIN selesai di-setup."

    # Setting /etc/resolv.conf otomatis, permanen, dan aman reboot
    echo
    echo "=== Setting /etc/resolv.conf manual & permanen ==="
    systemctl disable --now systemd-resolved 2>/dev/null || true
    systemctl stop resolvconf 2>/dev/null || true

    if [ -L /etc/resolv.conf ]; then
        rm -f /etc/resolv.conf
    fi

    cat <<EOF > /etc/resolv.conf
nameserver $IPADDR
nameserver 127.0.0.1
nameserver 8.8.8.8
search $DOMAIN
EOF

    if chattr +i /etc/resolv.conf 2>/dev/null; then
        echo "File /etc/resolv.conf dikunci agar tidak diubah otomatis."
    else
        echo "Gagal lock resolv.conf (abaikan jika tidak support, atau server pakai resolvconf/systemd-resolved)."
    fi

    echo "=== resolv.conf sudah permanen ==="

    # Tes DNS (nslookup & dig)
    echo
    echo "===== TESTING DNS ====="
    echo "Tes A record:"
    if nslookup $FQDN 127.0.0.1; then
        echo "nslookup $FQDN OK"
    else
        echo "nslookup gagal, coba dig:"
        dig @127.0.0.1 $FQDN
    fi

    echo "Tes MX record:"
    if nslookup -query=mx $DOMAIN 127.0.0.1; then
        echo "nslookup MX OK"
    else
        echo "nslookup MX gagal, coba dig:"
        dig @127.0.0.1 mx $DOMAIN
    fi

    echo
    echo "=== SEMUA LANGKAH PRE-INSTALL ZIMBRA & DNS SELESAI ==="
    echo "Pastikan hasil nslookup/dig di atas mengarah ke IP lokal dan sesuai zona yang kamu buat."
    echo "Jika test DNS gagal, cek status service dan log BIND/named:"
    echo "- Ubuntu: journalctl -xeu bind9"
    echo "- Rocky: journalctl -xeu named"
}

# === LOGIKA MENU ===
if [ "$ZIMBRA_OPT" == "1" ]; then
    basic_initialize
    install_dns_zimbra
else
    basic_initialize
fi

# === TAMPILKAN RANDOM ROOT PASSWORD JIKA ADA ===
if [[ "$SHOW_ROOTPW" == "1" ]]; then
    echo
    echo "==== INFO ===="
    echo "Password root (auto-random, simpan baik-baik!):"
    echo "  $ROOTPW_RANDOM"
    echo "=============="
fi
