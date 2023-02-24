#!/usr/bin/env bash
pnpm install
pnpm build
node ./build/index.js
