#!/bin/bash

# Get script dir and basic variables
DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"
tmpdir="/tmp/tmp.$(( RANDOM * 19318203981230 + 40 ))"
plugin="user.scripts.enhanced"
version=$(date +"%Y.%m.%d")
archive="$DIR/archive"
target="$tmpdir/usr/local/emhttp/plugins/$plugin"

# Create dirs
mkdir -p "$target" "$archive"

# Copy source files into temp build dir
cp -R -p "$DIR/source/." "$target/"
chown -R root:root "$target"
chmod -R 0755 "$target"

# Determine final filename
output_name="${plugin}-${version}.txz"
count=1
used_count=false
while [[ -e "$archive/$output_name" ]]; do
    output_name="${plugin}-${version}-${count}.txz"
    ((count++))
    used_count=true
done

# Create archive in safe temp path
cd "$tmpdir"
tmp_output="/tmp/$output_name"
makepkg -l n -c n "$tmp_output" > /dev/null 2>&1

# Abort if build failed
[[ ! -f "$tmp_output" ]] && echo "makepkg failed" && rm -rf "$tmpdir" && exit 1

# Move archive back to archive folder
mv "$tmp_output" "$archive"
rm -rf "$tmpdir"

# Output summary
echo -e "Version: ${version}$([[ "$used_count" == true ]] && echo "-$((count-1))")"
echo -e "MD5: $(md5sum "$archive/$output_name" | awk '{print $1}')"
