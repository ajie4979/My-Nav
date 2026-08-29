import { DB_SCHEMA, SCHEMA_VERSION, PREVIOUS_SCHEMA_VERSION } from '../constants';
import { seedDemoData } from './seed-demo';

let schemaReady = false;
let schemaReadyPromise = null;

async function runBaseSchema(db) {
  const statements = DB_SCHEMA.split(';')
    .map(stmt => stmt.trim())
    .filter(Boolean)
    .map(stmt => db.prepare(stmt));

  // 逐条执行并容忍单条失败：旧数据库可能缺少新列，导致个别 CREATE INDEX 失败，
  // 不影响其余建表语句（缺失列由 ensureAllColumns 补全）
  for (const stmt of statements) {
    try {
      await stmt.run();
    } catch (error) {
      console.warn('Schema statement skipped:', error.message);
    }
  }
}

// 补齐各表在最新 DB_SCHEMA 中新增的字段（兼容旧版本数据库）
async function ensureAllColumns(env) {
  const tableChecks = [
    {
      table: 'posts',
      columns: [
        { name: 'category', ddl: "ALTER TABLE posts ADD COLUMN category TEXT DEFAULT '未分类'" },
        { name: 'author', ddl: "ALTER TABLE posts ADD COLUMN author TEXT DEFAULT '管理员'" },
        { name: 'like_count', ddl: 'ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0' },
        { name: 'comment_count', ddl: 'ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0' },
      ],
    },
    {
      table: 'musics',
      columns: [
        // 注意：SQLite 的 ALTER TABLE ADD COLUMN 不允许非恒定默认值（如 CURRENT_TIMESTAMP）
        { name: 'update_time', ddl: 'ALTER TABLE musics ADD COLUMN update_time TIMESTAMP' },
      ],
    },
  ];
  for (const tc of tableChecks) {
    try {
      const cols = await env.NAV_DB.prepare(`PRAGMA table_info(${tc.table})`).all();
      const names = new Set((cols.results || []).map(c => c.name));
      for (const col of tc.columns) {
        if (names.has(col.name)) continue;
        try {
          await env.NAV_DB.prepare(col.ddl).run();
        } catch (error) {
          console.warn(`ALTER ${tc.table} ADD ${col.name} skipped:`, error.message);
        }
      }
    } catch (error) {
      console.warn(`Check ${tc.table} columns failed:`, error.message);
    }
  }
}

async function runIncrementalMigrations(env) {
  await env.NAV_DB.batch([
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_catelog_id ON sites(catelog_id)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_sort_order ON sites(sort_order)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_private_sort ON sites(is_private, sort_order)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_catelog_name ON sites(catelog_name)'),
    env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_url ON sites(url)')
  ]);

  const [sitesColumns, categoryColumns, pendingColumns, postsColumns] = await Promise.all([
    env.NAV_DB.prepare('PRAGMA table_info(sites)').all(),
    env.NAV_DB.prepare('PRAGMA table_info(category)').all(),
    env.NAV_DB.prepare('PRAGMA table_info(pending_sites)').all(),
    env.NAV_DB.prepare('PRAGMA table_info(posts)').all(),
  ]);
  const sitesCols = new Set((sitesColumns.results || []).map(column => column.name));
  const categoryCols = new Set((categoryColumns.results || []).map(column => column.name));
  const pendingCols = new Set((pendingColumns.results || []).map(column => column.name));
  const postsCols = new Set((postsColumns.results || []).map(column => column.name));

  const alterStatements = [];
  const sitesMissingCatalogName = !sitesCols.has('catelog_name');
  const pendingMissingCatalogName = !pendingCols.has('catelog_name');

  if (!sitesCols.has('is_private')) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE sites ADD COLUMN is_private INTEGER DEFAULT 0'));
  }
  if (!sitesCols.has('is_star')) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE sites ADD COLUMN is_star INTEGER DEFAULT 0'));
  }
  if (sitesMissingCatalogName) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE sites ADD COLUMN catelog_name TEXT'));
  }
  if (pendingMissingCatalogName) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE pending_sites ADD COLUMN catelog_name TEXT'));
  }
  if (!categoryCols.has('is_private')) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE category ADD COLUMN is_private INTEGER DEFAULT 0'));
  }
  if (!categoryCols.has('parent_id')) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE category ADD COLUMN parent_id INTEGER DEFAULT 0'));
  }

  // posts 表新增字段迁移
  if (!postsCols.has('category')) {
    alterStatements.push(env.NAV_DB.prepare("ALTER TABLE posts ADD COLUMN category TEXT DEFAULT '未分类'"));
  }
  if (!postsCols.has('author')) {
    alterStatements.push(env.NAV_DB.prepare("ALTER TABLE posts ADD COLUMN author TEXT DEFAULT '管理员'"));
  }
  if (!postsCols.has('like_count')) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE posts ADD COLUMN like_count INTEGER DEFAULT 0'));
  }
  if (!postsCols.has('comment_count')) {
    alterStatements.push(env.NAV_DB.prepare('ALTER TABLE posts ADD COLUMN comment_count INTEGER DEFAULT 0'));
  }

  for (const statement of alterStatements) {
    try {
      await statement.run();
    } catch (error) {
      console.warn('Schema alter skipped:', error.message);
    }
  }
  // is_star 列由上方 ALTER 补齐后再建索引（旧库首次升级到本版本前该列不存在，不能放进补列前的 batch）
  try {
    await env.NAV_DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_star ON sites(is_star)').run();
  } catch (error) {
    console.warn('Create idx_sites_star skipped:', error.message);
  }

  if (sitesMissingCatalogName) {
    await env.NAV_DB.prepare(`
      UPDATE sites
      SET catelog_name = (
        SELECT catelog FROM category WHERE category.id = sites.catelog_id
      )
      WHERE catelog_name IS NULL
    `).run();
  }

  if (pendingMissingCatalogName) {
    await env.NAV_DB.prepare(`
      UPDATE pending_sites
      SET catelog_name = (
        SELECT catelog FROM category WHERE category.id = pending_sites.catelog_id
      )
      WHERE catelog_name IS NULL
    `).run();
  }
}

export async function ensureSchemaReady(env) {
  if (!env || !env.NAV_DB) return;
  if (schemaReady) return;
  if (schemaReadyPromise) {
    await schemaReadyPromise;
    return;
  }

  schemaReadyPromise = (async () => {
    const kv = env.NAV_AUTH;

    if (kv) {
      try {
        const migrated = await kv.get(`schema_migrated_${SCHEMA_VERSION}`);
        if (migrated) {
          schemaReady = true;
          // 幂等检查示例数据（兼容旧部署空库场景）
          await seedDemoData(env);
          return;
        }
      } catch (error) {
        console.warn('Schema version check failed:', error);
      }
    }

    try {
      // 先补全所有表的缺失字段，避免 DB_SCHEMA 中依赖新列的索引创建失败
      await ensureAllColumns(env);
      await runBaseSchema(env.NAV_DB);
      await runIncrementalMigrations(env);

      // 首次建库成功后自动写入示例数据（书签 / 博客 / 音乐）
      await seedDemoData(env);

      if (kv) {
        await kv.put(`schema_migrated_${SCHEMA_VERSION}`, 'true');

        if (PREVIOUS_SCHEMA_VERSION && PREVIOUS_SCHEMA_VERSION !== SCHEMA_VERSION) {
          try {
            await kv.delete(`schema_migrated_${PREVIOUS_SCHEMA_VERSION}`);
          } catch (cleanupError) {
            console.warn('Previous schema marker cleanup failed:', cleanupError);
          }
        }
      }

      schemaReady = true;
    } catch (error) {
      console.error('Schema migration failed:', error);
    }
  })().finally(() => {
    schemaReadyPromise = null;
  });

  await schemaReadyPromise;
}
