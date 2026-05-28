/**
 * 简化版 v0.2.1 测试
 * 手动验证关键功能
 */

const WebSocket = require('ws');

const SERVER_URL = 'ws://localhost:3000';
let passed = 0;
let failed = 0;

function log(test, result, details = '') {
  const status = result ? '✅' : '❌';
  console.log(`${status} ${test}${details ? ': ' + details : ''}`);
  if (result) passed++; else failed++;
}

function createWS() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function waitForMessage(ws, event, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeAllListeners('message');
      reject(new Error('Timeout'));
    }, timeout);
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        const evt = msg.event || msg.type;
        if (evt === event) {
          clearTimeout(timer);
          ws.removeAllListeners('message');
          resolve(msg);
        }
      } catch (e) {}
    });
  });
}

async function main() {
  console.log('========================================');
  console.log('  v0.2.1 简化测试');
  console.log('========================================\n');
  
  let screenWs, controllerWs;
  
  try {
    // 测试 1: room_created 返回 joinUrl
    console.log('测试 1: room_created 返回 joinUrl');
    screenWs = await createWS();
    screenWs.send(JSON.stringify({ event: 'create_room' }));
    const roomCreated = await waitForMessage(screenWs, 'room_created');
    
    log('room_created 返回 joinUrl', 
      roomCreated.joinUrl && roomCreated.joinUrl.includes(roomCreated.roomId),
      `roomId=${roomCreated.roomId}, joinUrl=${roomCreated.joinUrl}`);
    
    // 测试 2: joinUrl 格式正确
    console.log('\n测试 2: joinUrl 格式正确');
    const expected = `http://localhost:3000/controller.html?roomId=${roomCreated.roomId}`;
    log('joinUrl 格式正确',
      roomCreated.joinUrl === expected,
      `期望: ${expected}`);
    
    // 测试 3: controller 加入房间
    console.log('\n测试 3: controller 加入房间');
    controllerWs = await createWS();
    controllerWs.send(JSON.stringify({ event: 'join_room', roomId: roomCreated.roomId }));
    const roomJoined = await waitForMessage(controllerWs, 'room_joined');
    
    log('controller 加入房间',
      roomJoined.roomId === roomCreated.roomId && roomJoined.playerIndex === 0,
      `roomId=${roomJoined.roomId}, playerIndex=${roomJoined.playerIndex}`);
    
    // 测试 4: screen close_room
    console.log('\n测试 4: screen close_room');
    screenWs.send(JSON.stringify({ event: 'close_room' }));
    const roomClosed = await waitForMessage(controllerWs, 'room_closed');
    
    log('close_room → room_closed',
      roomClosed.event === 'room_closed' && roomClosed.reason === 'host_closed',
      `reason=${roomClosed.reason}`);
    
    await new Promise(r => setTimeout(r, 500));
    
    // 测试 5: closed room 无法 join
    console.log('\n测试 5: closed room 无法 join');
    const controller2Ws = await createWS();
    controller2Ws.send(JSON.stringify({ event: 'join_room', roomId: roomCreated.roomId }));
    const roomNotFound = await waitForMessage(controller2Ws, 'room_not_found');
    
    log('closed room 无法 join',
      roomNotFound.event === 'room_not_found',
      `roomId=${roomCreated.roomId}`);
    
    controller2Ws.close();
    
    // 测试 6: screen 断开 → room_closed
    console.log('\n测试 6: screen 断开 → room_closed');
    const screenWs2 = await createWS();
    screenWs2.send(JSON.stringify({ event: 'create_room' }));
    const roomCreated2 = await waitForMessage(screenWs2, 'room_created');
    
    const controller3Ws = await createWS();
    controller3Ws.send(JSON.stringify({ event: 'join_room', roomId: roomCreated2.roomId }));
    await waitForMessage(controller3Ws, 'room_joined');
    
    screenWs2.close();
    await new Promise(r => setTimeout(r, 500));
    
    // 注意：controller 可能已断开，需要重新连接
    const controller4Ws = await createWS();
    controller4Ws.send(JSON.stringify({ event: 'join_room', roomId: roomCreated2.roomId }));
    const roomNotFound2 = await waitForMessage(controller4Ws, 'room_not_found');
    
    log('screen 断开 → room 删除',
      roomNotFound2.event === 'room_not_found',
      'room 已从内存删除');
    
    controller4Ws.close();
    
    // 测试 7: game_message.type 透明转发
    console.log('\n测试 7: game_message.type 透明转发');
    const screenWs3 = await createWS();
    screenWs3.send(JSON.stringify({ event: 'create_room' }));
    const roomCreated3 = await waitForMessage(screenWs3, 'room_created');
    
    const controller5Ws = await createWS();
    controller5Ws.send(JSON.stringify({ event: 'join_room', roomId: roomCreated3.roomId }));
    await waitForMessage(controller5Ws, 'room_joined');
    
    // controller 发送自定义 type
    controller5Ws.send(JSON.stringify({
      event: 'game_message',
      type: 'input.v021_test',
      data: { test: true }
    }));
    
    const gameMessage = await waitForMessage(screenWs3, 'game_message');
    
    log('game_message.type 透明转发',
      gameMessage.type === 'input.v021_test' && gameMessage.playerIndex === 0,
      `type=${gameMessage.type}, playerIndex=${gameMessage.playerIndex}`);
    
    screenWs3.close();
    controller5Ws.close();
    
    // 输出结果
    console.log('\n========================================');
    console.log(`  结果: ${passed}/${passed + failed} PASS`);
    console.log('========================================\n');
    
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('测试失败:', error.message);
    process.exit(1);
  }
}

main();
