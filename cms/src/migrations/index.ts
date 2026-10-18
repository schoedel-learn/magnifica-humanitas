import * as migration_20261006_065956_initial from './20261006_065956_initial';
import * as migration_20261006_071134_unify_publish_flag from './20261006_071134_unify_publish_flag';
import * as migration_20261006_160000_localize_paragraph_extract from './20261006_160000_localize_paragraph_extract';
import * as migration_20261010_120000_add_source_published_on from './20261010_120000_add_source_published_on';
import * as migration_20261010_140000_add_source_edition from './20261010_140000_add_source_edition';
import * as migration_20261013_125125_add_site_settings from './20261013_125125_add_site_settings';
import * as migration_20261018_141600_add_post_types from './20261018_141600_add_post_types';
import * as migration_20261018_142900_add_bible_kind from './20261018_142900_add_bible_kind';

export const migrations = [
  {
    up: migration_20261006_065956_initial.up,
    down: migration_20261006_065956_initial.down,
    name: '20261006_065956_initial',
  },
  {
    up: migration_20261006_071134_unify_publish_flag.up,
    down: migration_20261006_071134_unify_publish_flag.down,
    name: '20261006_071134_unify_publish_flag',
  },
  {
    up: migration_20261006_160000_localize_paragraph_extract.up,
    down: migration_20261006_160000_localize_paragraph_extract.down,
    name: '20261006_160000_localize_paragraph_extract',
  },
  {
    up: migration_20261010_120000_add_source_published_on.up,
    down: migration_20261010_120000_add_source_published_on.down,
    name: '20261010_120000_add_source_published_on',
  },
  {
    up: migration_20261010_140000_add_source_edition.up,
    down: migration_20261010_140000_add_source_edition.down,
    name: '20261010_140000_add_source_edition',
  },
  {
    up: migration_20261013_125125_add_site_settings.up,
    down: migration_20261013_125125_add_site_settings.down,
    name: '20261013_125125_add_site_settings'
  },
  {
    up: migration_20261018_141600_add_post_types.up,
    down: migration_20261018_141600_add_post_types.down,
    name: '20261018_141600_add_post_types'
  },
  {
    up: migration_20261018_142900_add_bible_kind.up,
    down: migration_20261018_142900_add_bible_kind.down,
    name: '20261018_142900_add_bible_kind'
  },
];
