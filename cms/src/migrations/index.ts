import * as migration_20261006_065956_initial from './20261006_065956_initial';
import * as migration_20261006_071134_unify_publish_flag from './20261006_071134_unify_publish_flag';
import * as migration_20261006_160000_localize_paragraph_extract from './20261006_160000_localize_paragraph_extract';
import * as migration_20261010_120000_add_source_published_on from './20261010_120000_add_source_published_on';

export const migrations = [
  {
    up: migration_20261006_065956_initial.up,
    down: migration_20261006_065956_initial.down,
    name: '20261006_065956_initial',
  },
  {
    up: migration_20261006_071134_unify_publish_flag.up,
    down: migration_20261006_071134_unify_publish_flag.down,
    name: '20261006_071134_unify_publish_flag'
  },
  {
    up: migration_20261006_160000_localize_paragraph_extract.up,
    down: migration_20261006_160000_localize_paragraph_extract.down,
    name: '20261006_160000_localize_paragraph_extract'
  },
  {
    up: migration_20261010_120000_add_source_published_on.up,
    down: migration_20261010_120000_add_source_published_on.down,
    name: '20261010_120000_add_source_published_on'
  },
];
