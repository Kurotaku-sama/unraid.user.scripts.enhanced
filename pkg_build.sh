#!/bin/bash
DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
tmpdir="/tmp/tmp.$(( RANDOM * 19318203981230 + 40 ))"
plugin="user.scripts.enhanced"
archive="$DIR/archive"
version=$(date +"%Y.%m.%d")

target="$tmpdir/usr/local/emhttp/plugins/$plugin"
mkdir -p "$target"
mkdir -p "$archive"

cp -R -p "$DIR/source/." "$target/"

chown -R root:root "$target"
chmod -R 0755 "$target"

cd "$tmpdir"

output_file="$archive/${plugin}-${version}.txz"
count=1
used_count=false
while [[ -e "$output_file" ]]; do
    output_file="$archive/${plugin}-${version}-$count.txz"
    ((count++))
    used_count=true
done

makepkg -l n -c n "$output_file" > /dev/null 2>&1
rm -rf "$tmpdir"

echo -e "Version: ${version}$([[ "$used_count" == true ]] && echo "-$((count-1))")"
echo -e "MD5: $(md5sum "$output_file" | awk '{print $1}')"