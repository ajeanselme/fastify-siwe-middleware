import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createTable('wallet_profiles', {
    address: { type: 'varchar(1000)', primaryKey: true },
    ens_name: { type: 'varchar(1000)', notNull: true },
    first_seen_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    last_seen_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    session_count: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.createTable('sessions', {
    id: 'id',
    address: {
      type: 'varchar(1000)',
      notNull: true,
      references: '"wallet_profiles"',
      onDelete: 'CASCADE',
    },
    refresh_hash: { type: 'varchar(1000)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    revoked_at: {
      type: 'timestamp',
      notNull: false,
    },
  });
  pgm.createIndex('sessions', 'address');
};