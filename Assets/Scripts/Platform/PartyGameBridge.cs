using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

/// <summary>
/// PartyGameSDK 桥接器
/// 负责 Unity ↔ JavaScript 双向通信
/// 
/// 功能：
/// 1. 接收来自 JavaScript 的消息（OnMessageReceived）
/// 2. 向 JavaScript 发送广播消息（BroadcastMessage）
/// 
/// 平台区分：
/// - WebGL 模式：使用 JSBridge (jslib)
/// - Editor 模式：只 Debug.Log，不调用 JS
/// </summary>
public class PartyGameBridge : MonoBehaviour
{
    // 单例实例
    public static PartyGameBridge Instance { get; private set; }
    
    [Header("调试")]
    [Tooltip("是否在控制台打印所有消息")]
    public bool enableDebugLog = true;
    
    // 消息接收事件（其他脚本可以监听）
    public UnityEvent<PartyGameMessage> OnMessageReceivedEvent;
    
    // 内部消息队列（主线程安全）
    private Queue<string> messageQueue = new Queue<string>();
    private readonly object queueLock = new object();
    
    #region Unity 生命周期
    
    private void Awake()
    {
        // 单例模式
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        
        Instance = this;
        DontDestroyOnLoad(gameObject);
        
        if (OnMessageReceivedEvent == null)
            OnMessageReceivedEvent = new UnityEvent<PartyGameMessage>();
    }
    
    private void Update()
    {
        // 在主线程处理消息队列
        ProcessMessageQueue();
    }
    
    private void OnDestroy()
    {
        if (Instance == this)
            Instance = null;
    }
    
    #endregion
    
    #region JavaScript → Unity (被 jslib 调用)
    
    /// <summary>
    /// JavaScript 调用此方法来发送消息给 Unity
    /// 此方法会被 PartyGameBridge.jslib 调用
    /// </summary>
    /// <param name="jsonMessage">JSON 格式的消息</param>
    public void OnMessageReceived(string jsonMessage)
    {
        // 将消息加入队列（线程安全）
        lock (queueLock)
        {
            messageQueue.Enqueue(jsonMessage);
        }
    }
    
    /// <summary>
    /// 处理消息队列（在主线程执行）
    /// </summary>
    private void ProcessMessageQueue()
    {
        lock (queueLock)
        {
            while (messageQueue.Count > 0)
            {
                string jsonMessage = messageQueue.Dequeue();
                ProcessMessage(jsonMessage);
            }
        }
    }
    
    /// <summary>
    /// 处理单条消息
    /// </summary>
    private void ProcessMessage(string jsonMessage)
    {
        try
        {
            if (enableDebugLog)
                Debug.Log($"[PartyGameBridge] Received: {jsonMessage}");
            
            // 解析消息
            PartyGameMessage message = JsonUtility.FromJson<PartyGameMessage>(jsonMessage);
            
            if (message == null)
            {
                Debug.LogWarning($"[PartyGameBridge] Failed to parse message: {jsonMessage}");
                return;
            }
            
            // 验证消息格式
            if (string.IsNullOrEmpty(message.type))
            {
                Debug.LogWarning($"[PartyGameBridge] Message missing 'type' field: {jsonMessage}");
                return;
            }
            
            // 触发事件，让其他脚本处理
            OnMessageReceivedEvent?.Invoke(message);
        }
        catch (Exception e)
        {
            Debug.LogError($"[PartyGameBridge] Error processing message: {e.Message}\nMessage: {jsonMessage}");
        }
    }
    
    #endregion
    
    #region Unity → JavaScript (发送广播)
    
    /// <summary>
    /// 广播分数更新（第 4 条要求）
    /// </summary>
    public void BroadcastScoreUpdate(Dictionary<int, int> scores)
    {
        if (!Application.isPlaying)
            return;
        
        // 构建分数对象（转换为 JSON 字符串）
        string scoresJson = DictionaryToJson(scores);
        
        // 构建广播数据
        ScoreUpdateData data = new ScoreUpdateData
        {
            scores = scoresJson
        };
        
        // 日志埋点：[Unity] Broadcast state.score_update
        Debug.Log($"[Unity] Broadcast state.score_update: scores={scoresJson}");
        
        // 广播消息
        BroadcastMessage(PartyGameMessageTypes.STATE_SCORE_UPDATE, data);
    }
    
    /// <summary>
    /// 广播消息给所有客户端（controller）
    /// 通过 JavaScript 转发给服务器，再广播给所有 controller
    /// </summary>
    /// <param name="type">消息类型，如 "state.score_update"</param>
    /// <param name="data">数据对象（会被 JsonUtility.ToJson）</param>
    public void BroadcastMessage(string type, object data)
    {
        if (!Application.isPlaying)
            return;
        
        // 构建消息对象
        BroadcastMessageWrapper wrapper = new BroadcastMessageWrapper
        {
            @eventType = PartyGameEventTypes.BROADCAST,
            type = type,
            dataJson = JsonUtility.ToJson(data)
        };
        
        string jsonMessage = JsonUtility.ToJson(wrapper);
        
        // 日志埋点：[PartyGameBridge] Broadcast called
        Debug.Log($"[PartyGameBridge] Broadcast called: {jsonMessage}");
        
        // 根据平台调用不同的实现
#if UNITY_WEBGL && !UNITY_EDITOR
        // WebGL 模式：调用 JavaScript
        Debug.Log($"[PartyGameBridge] [WebGL Mode] Calling PG_Broadcast...");
        SendToJavaScript(jsonMessage);
#else
        // Editor 模式或非 WebGL 平台：模拟发送（用于编辑器测试）
        Debug.Log($"[PartyGameBridge] [Editor Mode] Mock Broadcast: {jsonMessage}");
#endif
    }
    
    /// <summary>
    /// 发送游戏结束广播
    /// </summary>
    public void BroadcastGameOver(int finalScore, int winnerIndex)
    {
        GameOverData data = new GameOverData
        {
            finalScore = finalScore,
            winnerIndex = winnerIndex
        };
        
        BroadcastMessage(PartyGameMessageTypes.STATE_GAME_OVER, data);
    }
    
    #endregion
    
    #region JavaScript 插件调用 (WebGL 专用)
    
#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]
    private static extern void SendToJavaScript(string jsonMessage);
#endif
    
    #endregion
    
    #region 工具方法
    
    /// <summary>
    /// 将 Dictionary<int, int> 转换为 JSON 字符串
    /// 格式：{"0":1,"1":2}
    /// </summary>
    private string DictionaryToJson(Dictionary<int, int> dict)
    {
        var entries = new List<string>();
        foreach (var kvp in dict)
        {
            entries.Add($"\"{kvp.Key}\":{kvp.Value}");
        }
        return "{" + string.Join(",", entries) + "}";
    }
    
    #endregion
}

/// <summary>
/// 广播消息包装器（用于 JsonUtility 序列化）
/// </summary>
[Serializable]
public class BroadcastMessageWrapper
{
    public string @eventType;
    public string type;
    public string dataJson;
}

/// <summary>
/// 分数更新数据
/// </summary>
[Serializable]
public class ScoreUpdateData
{
    public string scores;  // JSON 对象字符串，如 {"0":1,"1":2}
}

/// <summary>
/// 游戏结束数据
/// </summary>
[Serializable]
public class GameOverData
{
    public int finalScore;
    public int winnerIndex;
}
