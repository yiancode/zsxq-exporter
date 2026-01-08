// SQLite 数据库 Schema 定义

export const SCHEMA = `
-- 星球缓存
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_name TEXT,
  member_count INTEGER,
  topics_count INTEGER,
  created_at TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 帖子缓存
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  owner_id TEXT,
  owner_name TEXT,
  images TEXT,
  files TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  reading_count INTEGER DEFAULT 0,
  digested INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(group_id)
);

-- 导出记录
CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_id TEXT UNIQUE NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT,
  start_date TEXT,
  end_date TEXT,
  topic_count INTEGER,
  image_count INTEGER,
  file_path TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- AI 分析记录
CREATE TABLE IF NOT EXISTS analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_id TEXT UNIQUE NOT NULL,
  export_id TEXT,
  type TEXT NOT NULL,
  input_summary TEXT,
  result TEXT,
  model TEXT,
  tokens_used INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (export_id) REFERENCES exports(export_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_topics_group_id ON topics(group_id);
CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);
CREATE INDEX IF NOT EXISTS idx_exports_group_id ON exports(group_id);
CREATE INDEX IF NOT EXISTS idx_exports_status ON exports(status);
`;
