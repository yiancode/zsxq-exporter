import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getExport } from '@/lib/db/queries';

/**
 * GET /api/download/[id] - 下载导出的 ZIP 文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: exportId } = await params;

    // 获取导出记录
    const exportRecord = getExport(exportId);

    if (!exportRecord) {
      return NextResponse.json(
        { error: '导出记录不存在' },
        { status: 404 }
      );
    }

    if (exportRecord.status !== 'completed') {
      return NextResponse.json(
        { error: '导出尚未完成' },
        { status: 400 }
      );
    }

    if (!exportRecord.file_path) {
      return NextResponse.json(
        { error: '导出文件不存在' },
        { status: 404 }
      );
    }

    // 检查文件是否存在
    if (!fs.existsSync(exportRecord.file_path)) {
      return NextResponse.json(
        { error: '导出文件已被删除' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = fs.readFileSync(exportRecord.file_path);
    const fileName = path.basename(exportRecord.file_path);

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('下载失败:', error);
    const message = error instanceof Error ? error.message : '下载失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
