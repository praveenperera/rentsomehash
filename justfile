node := "fnm exec --using .node-version --"

# development server
dev:
    {{ node }} zsh -lc 'cd web && npm run dev -- --open'

# build the site
build: install
    {{ node }} zsh -lc 'cd web && npm run build'

# install dependencies
install:
    {{ node }} zsh -lc 'cd web && npm install'

# run astro checks
check:
    {{ node }} zsh -lc 'cd web && npm run check'

# format web code
fmt:
    {{ node }} zsh -lc 'cd web && npx prettier --write .'

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
