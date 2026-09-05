-- Generic delivery identity: the lead CRM does not depend on a specific provider.
alter table if exists public.broadcast_recipients
  add column if not exists provider_message_id text;

create index if not exists broadcast_recipients_provider_message_idx
  on public.broadcast_recipients(provider_message_id)
  where provider_message_id is not null;
