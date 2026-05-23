// PartyGameBridge.jslib
// Unity WebGL JavaScript 插件
// 负责：Unity ↔ 浏览器 JavaScript 双向通信

mergeInto(LibraryManager.library, {
  
  // ========================================
  // Unity → JavaScript（发送广播）
  // 由 C# 的 PartyGameBridge.BroadcastMessage() 调用
  // ========================================
  
  SendToJavaScript: function (jsonMessagePtr) {
    // 将 C# 字符串指针转换为 JavaScript 字符串
    var jsonMessage = UTF8ToString(jsonMessagePtr);
    
    console.log("[PartyGameBridge.jslib] Unity → JS:", jsonMessage);
    
    // 调用 screen.html 中定义的全局函数
    if (window.PartyGameSendToServer) {
      window.PartyGameSendToServer(jsonMessage);
    } else {
      console.error("[PartyGameBridge.jslib] PartyGameSendToServer not found!");
    }
  },
  
  // ========================================
  // JavaScript → Unity（接收消息）
  // 由 screen.html 调用 unityInstance.SendMessage()
  // 不需要在 jslib 中定义，直接调用 SendMessage 即可
  // ========================================
  
  // 注意：以下函数是在 screen.html 中定义的，不是在这里
  // 
  // 接收消息的调用方式（在 screen.html 中）：
  // unityInstance.SendMessage("PartyGameBridge", "OnMessageReceived", jsonMessage);
  // 
  // 这会调用 C# 的 PartyGameBridge.OnMessageReceived(string jsonMessage) 方法
  
});

// ========================================
// 以下函数在 screen.html 中定义，供 jslib 调用
// ========================================

// window.PartyGameSendToServer = function(jsonMessage) {
//   // 发送到服务器
//   if (ws && ws.readyState === WebSocket.OPEN) {
//     ws.send(jsonMessage);
//   }
// };

console.log("[PartyGameBridge.jslib] Loaded successfully");
