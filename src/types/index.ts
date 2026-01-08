// 导出选项
export interface ExportOptions {
  scope: 'all' | 'digests' | 'owner';
  include_images: boolean;
  include_comments: boolean;
  markdown_style: 'simple' | 'detailed';
}

// 导出进度
export interface ExportProgress {
  total_topics: number;
  fetched_topics: number;
  converted_topics: number;
  downloaded_images: number;
  total_images: number;
  current_step: string;
}

// 导出任务
export interface ExportTask {
  export_id: string;
  group_id: string;
  group_name: string;
  start_date: string;
  end_date: string;
  options: ExportOptions;
  status: 'pending' | 'fetching' | 'converting' | 'downloading_images' | 'zipping' | 'completed' | 'failed';
  progress: ExportProgress;
  error?: string;
}

// 缓存的帖子
export interface CachedTopic {
  id: number;
  topic_id: string;
  group_id: string;
  type: 'talk' | 'task' | 'q&a' | 'solution';
  title?: string;
  content: string;
  owner_id: string;
  owner_name: string;
  images: string[];
  files: FileInfo[];
  likes_count: number;
  comments_count: number;
  reading_count: number;
  digested: boolean;
  created_at: string;
  fetched_at: string;
}

// 文件信息
export interface FileInfo {
  name: string;
  url: string;
  size?: number;
}

// AI 分析请求
export interface AnalysisRequest {
  type: 'review' | 'summary' | 'keywords' | 'style';
  content: string;
  options?: AnalysisOptions;
}

// 分析选项
export interface AnalysisOptions {
  period?: 'week' | 'month' | 'quarter' | 'year';
  focus?: string[];
  language?: 'zh' | 'en';
}

// 内容生成请求
export interface GenerateRequest {
  type: 'annual_summary' | 'monthly_review' | 'new_post';
  reference_content: string;
  style_reference?: string;
  topic?: string;
  instructions?: string;
}

// 星球信息（简化版）
export interface GroupInfo {
  group_id: string;
  name: string;
  description?: string;
  owner_name?: string;
  member_count?: number;
  topics_count?: number;
}

// 导出记录
export interface ExportRecord {
  id: number;
  export_id: string;
  group_id: string;
  group_name: string;
  start_date: string;
  end_date: string;
  topic_count: number;
  image_count: number;
  file_path?: string;
  status: string;
  created_at: string;
  completed_at?: string;
}
