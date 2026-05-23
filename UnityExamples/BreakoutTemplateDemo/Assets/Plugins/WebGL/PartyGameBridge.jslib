// PartyGameBridge.jslib
// Unity WebGL JavaScript Plugin — PartyGameSDK v0.2.5
// 标准化：Unity ↔ JavaScript 双向通信
//
// 调用链：
//   Unity Broadcast → C# → SendToJavaScript() → jslib → window.PartyGameSendToServer()
//   JS → unityInstance.SendMessage("PartyGameBridge", "OnPlatformMessage", json)
//
// 约定：
//   - GameObject 名称必须为 "PartyGameBridge"
//   - Unity 接收方法为 OnPlatformMessage(string jsonMessage)
//   - window.PartyGameSendToServer 由 partygame-template.js 注册

mergeInto(LibraryManager.library, {

  // ========================================
  // Unity → JavaScript (发送 broadcast)
  // C# 调用: SendToJavaScript(jsonMessage)
  // ========================================
  SendToJavaScript: function (jsonMessagePtr) {
    var jsonMessage = UTF8ToString(jsonMessagePtr);
    console.log("[PartyGameBridge.jslib] Unity → JS:", jsonMessage);

    if (window.PartyGameSendToServer) {
      window.PartyGameSendToServer(jsonMessage);
    } else {
      console.error("[PartyGameBridge.jslib] PartyGameSendToServer not found! Ensure partygame-template.js is loaded.");
    }
  },

});
