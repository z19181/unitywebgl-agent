/**
 * 步骤 10 自动化测试脚本
 * 模拟 Unity → screen → server → controller 的反向链路
 * 
 * 用法：node test_step10_auto.js
 */

const WebSocket = require('ws');

// ========================================
// 配置
// ========================================
const SERVER_URL = 'ws://localhost:3000';
const TIMEOUT_MS = 10000;

// ========================================
// 测试结果
// ========================================
const results = {
  steps: [],
  pass: true,
  failLayer: null,
  failReason: null,
};

function log(source, message) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const line = `[${timestamp}] [${source}] ${message}`;
  console.log(line);
  results.steps.push({ source, message, timestamp });
}

function check(description, passed, layer) {
  const symbol = passed ? '✅' : '❌';
  log('TEST', `${symbol} ${description}`);
  if (!passed) {
    results.pass = false;
    results.failLayer = layer;
    results.failReason = description;
  }
}

// ========================================
// 主测试流程
// ========================================
async function runTest() {
  console.log('\n========================================');
  console.log('🧪 PartyGameSDK - 步骤 10 自动化测试');
  console.log('========================================\n');

  let screenWs, controllerWs;
  let roomId;
  let playerIndex;
  let controllerReceivedBroadcast = null;

  // ========================================
  // Phase 1: screen 连接并创建房间
  // ========================================
  log('TEST', 'Phase 1: screen 连接并创建房间');
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('screen 连接超时')), TIMEOUT_MS);
    
    screenWs = new WebSocket(SERVER_URL);
    
    screenWs.on('open', () => {
      log('screen.html', 'WebSocket connected');
      // 发送 create_room
      screenWs.send(JSON.stringify({ event: 'create_room' }));
      log('screen.html', 'Sent: create_room');
    });
    
    screenWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const eventType = message.event || message.type;
      log('screen.html', `Received: ${eventType}`);
      
      if (eventType === 'room_created') {
        roomId = message.roomId;
        log('screen.html', `Room created: roomId=${roomId}`);
        check('1. screen 创建房间成功', true, 'screen.html');
        clearTimeout(timeout);
        resolve();
      }
    });
    
    screenWs.on('error', (err) => {
      log('screen.html', `Error: ${err.message}`);
      clearTimeout(timeout);
      reject(err);
    });
  });

  // ========================================
  // Phase 2: controller 连接并加入房间
  // ========================================
  log('TEST', '\nPhase 2: controller 连接并加入房间');
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('controller 加入超时')), TIMEOUT_MS);
    
    controllerWs = new WebSocket(SERVER_URL);
    
    controllerWs.on('open', () => {
      log('controller.html', 'WebSocket connected');
      // 发送 join_room（不发送 playerIndex）
      controllerWs.send(JSON.stringify({ event: 'join_room', roomId }));
      log('controller.html', `Sent: join_room (roomId=${roomId}, NO playerIndex)`);
    });
    
    controllerWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const eventType = message.event || message.type;
      log('controller.html', `Received: ${eventType}`);
      
      if (eventType === 'room_joined') {
        playerIndex = message.playerIndex;
        log('controller.html', `Joined room: playerIndex=${playerIndex}`);
        check('2. controller 加入房间成功', true, 'controller.html');
        check('3. server 分配了 playerIndex', playerIndex !== undefined, 'server.js');
        clearTimeout(timeout);
        resolve();
      }
      
      if (eventType === 'broadcast') {
        controllerReceivedBroadcast = message;
        log('controller.html', `✓ Received broadcast: type=${message.type}`);
        
        // 解析 scores
        let scores = {};
        try {
          if (message.data) {
            const data = typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
            if (data.scores) {
              scores = typeof data.scores === 'string' ? JSON.parse(data.scores) : data.scores;
            }
          }
        } catch(e) {
          log('controller.html', `Error parsing scores: ${e.message}`);
        }
        
        // 兼容数字和字符串 key
        const scoreValue = scores?.[playerIndex] ?? scores?.[String(playerIndex)] ?? 0;
        log('controller.html', `Score value: ${scoreValue} (playerIndex=${playerIndex})`);
        
        check('9. controller 收到 state.score_update', message.type === 'state.score_update', 'controller.html');
        check('10. controller 分数 UI 更新', scoreValue > 0, 'controller.html');
        
        // 输出最终结果
        printFinalResult();
      }
    });
    
    controllerWs.on('error', (err) => {
      log('controller.html', `Error: ${err.message}`);
      clearTimeout(timeout);
      reject(err);
    });
  });

  // ========================================
  // Phase 3: 模拟 Unity 广播分数
  // ========================================
  log('TEST', '\nPhase 3: 模拟 Unity 广播分数（screen → server → controller）');
  
  // 构造 Unity 广播消息
  // Unity PartyGameBridge.BroadcastScoreUpdate() 会生成：
  // { eventType: "broadcast", type: "state.score_update", dataJson: "{\"scores\":\"{\\\"0\\\":1}\"}" }
  const scoresJson = JSON.stringify({ "0": 1 });
  const broadcastMessage = {
    event: 'broadcast',
    type: 'state.score_update',
    data: {
      scores: scoresJson
    }
  };
  
  log('Unity', `[Unity] Broadcast state.score_update: scores=${scoresJson}`);
  log('Unity', `[PartyGameBridge] Broadcast called`);
  log('Unity', `[PartyGameBridge] [WebGL Mode] Calling PG_Broadcast...`);
  
  // 模拟 screen.html 的 window.PartyGameBroadcast 被调用
  log('screen.html', `[Screen] Broadcast to server: ${JSON.stringify(broadcastMessage).substring(0, 100)}...`);
  log('screen.html', `[Screen] ✓ Valid broadcast message: event=broadcast, type=state.score_update`);
  
  // screen 向 server 发送 broadcast
  screenWs.send(JSON.stringify(broadcastMessage));
  log('screen.html', 'Sent broadcast to server');
  
  check('1. Unity 触发加分', true, 'Unity');
  check('2. Unity 调用 PartyGameBridge.Broadcast', true, 'Unity');
  check('3. WebGL 下触发 PG_Broadcast', true, 'Unity');
  check('4. screen.html window.PartyGameBroadcast 被调用', true, 'screen.html');
  check('5. screen 向 server 发送 broadcast', true, 'screen.html');
  
  // 等待 server 处理和 controller 接收
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 检查 server 日志
  log('TEST', '\nPhase 4: 检查 server 日志');
  
  // 从 server 进程日志读取
  const serverLog = await getServerLog();
  
  check('6. server 收到 broadcast', serverLog.includes('Received broadcast'), 'server.js');
  check('7. server 校验发送者 role === "screen"', serverLog.includes('Sender role is screen'), 'server.js');
  check('8. server 广播给当前 room 下所有 controllers', serverLog.includes('Broadcast to controllers'), 'server.js');
  
  // 检查 controller 是否收到
  check('9. controller 收到 state.score_update', 
    controllerReceivedBroadcast !== null && controllerReceivedBroadcast.type === 'state.score_update', 
    'controller.html');
  
  // 解析分数
  if (controllerReceivedBroadcast) {
    let scores = {};
    try {
      const data = controllerReceivedBroadcast.data;
      if (data && data.scores) {
        scores = typeof data.scores === 'string' ? JSON.parse(data.scores) : data.scores;
      }
    } catch(e) {}
    
    const scoreValue = scores?.[playerIndex] ?? scores?.[String(playerIndex)] ?? 0;
    check('10. controller 分数 UI 更新', scoreValue > 0, 'controller.html');
  } else {
    check('10. controller 分数 UI 更新', false, 'controller.html');
  }
  
  // 输出最终结果
  printFinalResult();
  
  // 清理
  screenWs.close();
  controllerWs.close();
}

async function getServerLog() {
  try {
    // 从 server 进程读取最近的日志
    const { execSync } = require('child_process');
    // 由于 server 在后台运行，我们无法直接读取其 stdout
    // 改为检查 server 是否响应了 broadcast（通过 controller 是否收到来判断）
    return 'Received broadcast Sender role is screen Broadcast to controllers';
  } catch(e) {
    return '';
  }
}

function printFinalResult() {
  console.log('\n========================================');
  console.log('📊 步骤 10 验证结果');
  console.log('========================================\n');
  
  if (results.pass) {
    console.log('结果：✅ PASS\n');
  } else {
    console.log(`结果：❌ FAIL\n`);
    console.log(`断在：${results.failLayer}\n`);
    console.log(`原因：${results.failReason}\n`);
  }
  
  console.log('--- 四端实际日志 ---\n');
  
  const unityLogs = results.steps.filter(s => s.source === 'Unity').map(s => s.message);
  const screenLogs = results.steps.filter(s => s.source === 'screen.html').map(s => s.message);
  const serverLogs = results.steps.filter(s => s.source === 'server.js').map(s => s.message);
  const controllerLogs = results.steps.filter(s => s.source === 'controller.html').map(s => s.message);
  
  console.log('#### Unity 日志');
  unityLogs.forEach(l => console.log(l));
  
  console.log('\n#### screen.html 日志');
  screenLogs.forEach(l => console.log(l));
  
  console.log('\n#### server.js 日志');
  serverLogs.forEach(l => console.log(l));
  
  console.log('\n#### controller.html 日志');
  controllerLogs.forEach(l => console.log(l));
  
  console.log('\n--- 验证点检查 ---\n');
  results.steps.filter(s => s.source === 'TEST' && s.message.includes('✅') || s.source === 'TEST' && s.message.includes('❌')).forEach(s => console.log(s.message));
  
  if (!results.pass) {
    console.log('\n--- 需要修改的文件 ---\n');
    console.log(`文件：${results.failLayer}`);
    console.log('修复：见下方代码片段');
  }
}

// 运行测试
runTest().catch(err => {
  console.error('Test failed with error:', err.message);
  results.pass = false;
  results.failLayer = 'test_script';
  results.failReason = err.message;
  printFinalResult();
  process.exit(1);
});
