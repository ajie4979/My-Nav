/**
 * 构建时把 Cloudflare「构建变量」中的个人资源 ID 注入 wrangler.toml。
 *
 * 背景：wrangler deploy 会用 wrangler.toml 覆盖网页上配置的远程绑定，
 * 导致 D1/KV 绑定反复丢失；但个人资源 ID 不能提交到公开仓库。
 * 因此 wrangler.toml 里用 ${D1_DATABASE_ID} / ${KV_NAMESPACE_ID} 占位，
 * 构建时从环境变量（Cloudflare 项目 → 设置 → 构建 → 构建变量）读取真实 ID 替换。
 *
 * 本地开发时：可在系统环境变量设置这两个值，或直接编辑 wrangler.toml（勿提交）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tomlPath = join(root, 'wrangler.toml');

let toml = readFileSync(tomlPath, 'utf8');

const d1Id = process.env.D1_DATABASE_ID || '';
const kvId = process.env.KV_NAMESPACE_ID || '';

let changed = false;

if (d1Id) {
  toml = toml.replace('${D1_DATABASE_ID}', d1Id);
  changed = true;
  console.log('[inject-bindings] D1_DATABASE_ID 已注入');
} else {
  console.warn('[inject-bindings] 未设置 D1_DATABASE_ID 构建变量，保留占位符（部署可能失败）');
}

if (kvId) {
  toml = toml.replace('${KV_NAMESPACE_ID}', kvId);
  changed = true;
  console.log('[inject-bindings] KV_NAMESPACE_ID 已注入');
} else {
  console.warn('[inject-bindings] 未设置 KV_NAMESPACE_ID 构建变量，保留占位符（部署可能失败）');
}

if (changed) {
  writeFileSync(tomlPath, toml, 'utf8');
}
