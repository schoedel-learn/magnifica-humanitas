import * as migration_20261006_065956_initial from './20261006_065956_initial';
import * as migration_20261006_071134_unify_publish_flag from './20261006_071134_unify_publish_flag';

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
];
