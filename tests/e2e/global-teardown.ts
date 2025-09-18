import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const teardown = async () => {
  console.log('🧹 清理 E2E 测试环境...');
  
  try {
    // 清理测试数据
    await cleanupTestData();
    
    // 关闭开发服务器进程（如果由测试启动）
    await cleanupProcesses();
    
    console.log('✅ E2E 测试环境已清理');
  } catch (error) {
    console.error('⚠️ E2E 测试环境清理时出现错误:', error);
  }
};

async function cleanupTestData(): Promise<void> {
  try {
    // 调用后端API清理测试数据
    const response = await fetch('http://localhost:3000/api/test/cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testEnvironment: true
      })
    });
    
    if (response.ok) {
      console.log('✅ 测试数据已清理');
    } else {
      console.log('⚠️ 测试数据清理失败，可能需要手动清理');
    }
  } catch (error) {
    console.log('⚠️ 无法连接后端服务进行数据清理');
  }
}

async function cleanupProcesses(): Promise<void> {
  try {
    // 查找并关闭可能的开发服务器进程
    const processes = [
      'node.*dev:h5',
      'vite.*8080',
      'vite.*8081'
    ];
    
    for (const pattern of processes) {
      try {
        await execAsync(`pkill -f "${pattern}"`);
      } catch (error) {
        // 进程可能不存在，忽略错误
      }
    }
    
    console.log('✅ 开发服务器进程已清理');
  } catch (error) {
    console.log('⚠️ 进程清理时出现错误:', error);
  }
}

export default teardown;
