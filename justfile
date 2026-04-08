node := "fnm exec --using .node-version --"
api := "api"
api_types := "web/src/lib/generated/hashpower-calculator"

alias gt := generate-types
alias gen-types := generate-types

# development server
dev:
    {{ node }} zsh -lc 'cd web && npm run dev -- --open'

# build the site
build: install
    {{ node }} zsh -lc 'cd web && npm run build'

# install dependencies
install:
    {{ node }} zsh -lc 'cd web && npm install'

# run project checks
check: check-types api-check
    {{ node }} zsh -lc 'cd web && npm run check'

# format project code
fmt:
    cargo fmt --manifest-path {{ api }}/Cargo.toml
    {{ node }} zsh -lc 'cd web && npx prettier --write .'

# lint rust api worker
clippy:
    cargo clippy --manifest-path {{ api }}/Cargo.toml --all-targets --all-features -- -D warnings

# check rust api worker wasm target
api-check:
    cargo check --manifest-path {{ api }}/Cargo.toml --target wasm32-unknown-unknown

# build rust api worker bundle for deploys
bundle-api:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v worker-build >/dev/null 2>&1; then
        cargo install -q worker-build --version 0.7.5
    fi
    cd {{ api }} && worker-build --release

# generate rust-owned frontend api types
generate-types:
    cd {{ api }} && TS_RS_EXPORT_DIR=../web/src/lib/generated/hashpower-calculator cargo test export_bindings

# check generated api types are current
check-types:
    #!/usr/bin/env bash
    set -euo pipefail
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    (cd {{ api }} && TS_RS_EXPORT_DIR="$tmp" cargo test export_bindings >/dev/null)
    diff -ru "$tmp" "{{ api_types }}"

# update all dependencies
update:
    {{ node }} zsh -lc 'cd web && npm update'

# deploy frontend worker to cloudflare
deploy-fe: build
    {{ node }} zsh -lc 'cd web && npx --yes wrangler deploy'

# deploy calculator api to cloudflare workers
deploy-api: bundle-api
    {{ node }} zsh -lc 'cd web && npx --yes wrangler deploy --config ../api/wrangler.toml'

# deploy frontend and api to cloudflare
deploy: deploy-fe deploy-api

# deploy preview to cloudflare workers (optional: just preview <subdomain>)
preview subdomain="": build
    #!/usr/bin/env bash
    name="{{ subdomain }}"
    if [ -z "$name" ]; then
        name=$(git branch --show-current | tr '/' '-' | tr '[:upper:]' '[:lower:]')
    fi
    fnm exec --using .node-version -- zsh -lc 'cd web && npx --yes wrangler versions upload --preview-alias "'"$name"'"'
