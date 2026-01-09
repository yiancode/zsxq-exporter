// 直接测试知识星球 API

const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('请提供 Token: node test-token.mjs <token>');
  process.exit(1);
}

console.log('Token 前20字符:', TOKEN.slice(0, 20) + '...');

// 测试获取星球列表
const response = await fetch('https://api.zsxq.com/v2/groups', {
  headers: {
    'Cookie': `zsxq_access_token=${TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  },
});

console.log('状态码:', response.status);
const data = await response.json();
console.log('响应:', JSON.stringify(data, null, 2).slice(0, 500));

if (data.succeeded && data.resp_data?.groups) {
  console.log('\n✅ Token 有效！找到', data.resp_data.groups.length, '个星球');
} else {
  console.log('\n❌ Token 无效或 API 调用失败');
  console.log('错误代码:', data.code);
}
