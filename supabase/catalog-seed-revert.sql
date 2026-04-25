-- Preview the seeded products before deleting them.
select id, slug, name, status, image_main
from public.products
where slug in (
  'nocturne-grid-vest',
  'lumina-column-dress',
  'afterlight-halter-top',
  'solstice-fringe-layer',
  'atelier-cascade-set',
  'marais-knot-skirt',
  'vesper-shoulder-drape',
  'mirage-frame-top',
  'obsidian-column-vest',
  'serein-resort-dress',
  'atelier-ribbon-top',
  'helios-grid-set',
  'night-bloom-drape-dress',
  'private-line-vest',
  'monarch-panel-top',
  'horizon-column-skirt',
  'atelier-sunframe-layer',
  'commission-halo-dress',
  'archive-satin-grid-top',
  'veil-structure-layer'
)
order by sort_order asc, slug asc;

-- Delete the seeded products if the preview above matches what you want removed.
delete from public.products
where slug in (
  'nocturne-grid-vest',
  'lumina-column-dress',
  'afterlight-halter-top',
  'solstice-fringe-layer',
  'atelier-cascade-set',
  'marais-knot-skirt',
  'vesper-shoulder-drape',
  'mirage-frame-top',
  'obsidian-column-vest',
  'serein-resort-dress',
  'atelier-ribbon-top',
  'helios-grid-set',
  'night-bloom-drape-dress',
  'private-line-vest',
  'monarch-panel-top',
  'horizon-column-skirt',
  'atelier-sunframe-layer',
  'commission-halo-dress',
  'archive-satin-grid-top',
  'veil-structure-layer'
);
