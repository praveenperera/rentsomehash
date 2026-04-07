node := "fnm exec --using .node-version --"
worker := "web/worker-rs"
api_types := "web/src/lib/generated/hashpower-calculator"

alias gt := generate-types
alias gen-types := generate-types

# development server
dev:
    {{ node }} zsh -lc 'cd web && npm run dev -- --open'

# build the site
build: install worker-check
    {{ node }} zsh -lc 'cd web && npm run build'

# install dependencies
install:
    {{ node }} zsh -lc 'cd web && npm install'

# run project checks
check: check-types worker-check
    {{ node }} zsh -lc 'cd web && npm run check'

# format project code
fmt:
    cargo fmt --manifest-path {{ worker }}/Cargo.toml
    {{ node }} zsh -lc 'cd web && npx prettier --write .'

# lint rust worker
clippy:
    cargo clippy --manifest-path {{ worker }}/Cargo.toml --all-targets --all-features -- -D warnings

# check rust worker wasm target
worker-check:
    cargo check --manifest-path {{ worker }}/Cargo.toml --target wasm32-unknown-unknown

# generate rust-owned frontend api types
generate-types:
    cd {{ worker }} && TS_RS_EXPORT_DIR=../src/lib/generated/hashpower-calculator cargo test export_bindings

# check generated api types are current
check-types:
    #!/usr/bin/env bash
    set -euo pipefail
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    (cd {{ worker }} && TS_RS_EXPORT_DIR="$tmp" cargo test export_bindings >/dev/null)
    diff -ru "$tmp" "{{ api_types }}"

# update all dependencies
update:
    {{ node }} zsh -lc 'cd web && npm update'

# deploy to cloudflare workers
deploy: build
    {{ node }} zsh -lc 'cd web && npx --yes wrangler deploy'

# deploy preview to cloudflare workers (optional: just preview <subdomain>)
preview subdomain="": build
    #!/usr/bin/env bash
    name="{{ subdomain }}"
    if [ -z "$name" ]; then
        name=$(git branch --show-current | tr '/' '-' | tr '[:upper:]' '[:lower:]')
    fi
    fnm exec --using .node-version -- zsh -lc 'cd web && npx --yes wrangler versions upload --preview-alias "'"$name"'"'
