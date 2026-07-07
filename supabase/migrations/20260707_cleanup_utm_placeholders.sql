update public.click_events
set utm_campaign = null
where lower(trim(coalesce(utm_campaign, ''))) in (
  '__campaign_name__',
  'campaign_name',
  '{{campaign.name}}',
  '{campaign_name}',
  'undefined',
  'null',
  ''
);

update public.click_events
set utm_source = null
where lower(trim(coalesce(utm_source, ''))) in (
  '__campaign_name__',
  'campaign_name',
  '{{campaign.name}}',
  '{campaign_name}',
  'undefined',
  'null',
  ''
);

update public.click_events
set utm_medium = null
where lower(trim(coalesce(utm_medium, ''))) in (
  '__campaign_name__',
  'campaign_name',
  '{{campaign.name}}',
  '{campaign_name}',
  'undefined',
  'null',
  ''
);

update public.click_events
set utm_content = null
where lower(trim(coalesce(utm_content, ''))) in (
  '__campaign_name__',
  'campaign_name',
  '{{campaign.name}}',
  '{campaign_name}',
  'undefined',
  'null',
  ''
);

update public.click_events
set utm_term = null
where lower(trim(coalesce(utm_term, ''))) in (
  '__campaign_name__',
  'campaign_name',
  '{{campaign.name}}',
  '{campaign_name}',
  'undefined',
  'null',
  ''
);
