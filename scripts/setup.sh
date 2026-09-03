#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' 'Run supabase/migrations/001_initial.sql then supabase/seed/nigeria_locations.sql in Supabase SQL Editor.'
printf '%s\n' 'Then configure apps/web/.env.local and worker/.env.'
