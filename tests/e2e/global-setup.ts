import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const setup = async () => {
  console.log('🚀 启动 E2E 测试环境...');
  
  try {
    // 检查后端服务是否运行
    await checkBackendService();
    
    // 启动前端开发服务器（如果尚未运行）
    await startDevServers();
    
    // 等待服务器完全启动
    await waitForServices();
    
    console.log('✅ E2E 测试环境已就绪');
  } catch (error) {
    console.error('❌ E2E 测试环境启动失败:', error);
    process.exit(1);
  }
};

async function checkBackendService(): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (!response.ok) {
      throw new Error('后端服务不可用');
    }
    console.log('✅ 后端服务已运行');
  } catch (error) {
    console.log('⚠️ 后端服务未运行，请先启动后端服务');
    throw error;
  }
}

async function startDevServers(): Promise<void> {
  // 检查用户端开发服务器
  await checkAndStartServer('user-app', 8080);
  // 检查商户端开发服务器
  await checkAndStartServer('merchant-app', 8081);
}

async function checkAndStartServer(appName: string, port: number): Promise<void> {
  try {
    const response = await fetch(`http://localhost:${port}`);
    if (response.ok) {
      console.log(`✅ ${appName} 开发服务器已运行 (端口 ${port})`);
      return;
    }
  } catch (error) {
    // 服务器未运行，尝试启动
  }
  
  console.log(`🚀 启动 ${appName} 开发服务器...`);
  
  const appPath = path.join(process.cwd(), 'frontend', appName);
  const child = spawn('npm', ['run', 'dev:h5'], {
    cwd: appPath,
    detached: true,
    stdio: 'ignore'
  });
  
  child.unref();
  
  // 等待服务器启动
  await waitForServer(port, 30000);
  console.log(`✅ ${appName} 开发服务器已启动 (端口 ${port})`);
}

async function waitForServer(port: number, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // 继续等待
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`服务器在 ${timeout}ms 内未启动 (端口 ${port})`);
}

async function waitForServices(): Promise<void> {
  // 额外等待确保所有服务完全就绪
  await new Promise(resolve => setTimeout(resolve, 5000));
}

export default setup;
