using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

/// <summary>
/// PartyGameSDK 桥接器 —— v0.2.5 标准化
/// 负责 Unity ↔ JavaScript 双向通信
///
/// 接入约定:
///   1. 场景中创建 GameObject，命名 "PartyGameBridge"
///   2. 挂载此脚本
///   3. GameManager 实现 OnPlatformMessage(string json)
///      或监听 OnMessageReceivedEvent
///
/// 平台区分:
///   - WebGL: 通过 jslib 调用 window.PartyGameSendToServer() 发送广播
///   - Editor: Debug.Log 模拟 (便于调试)
/// </summary>
public class PartyGameBridge : MonoBehaviour
{
    public static PartyGameBridge Instance { get; private set; }

    [Header("Debug")]
    public bool enableDebugLog = true;

    /// <summary>已解析的消息事件 (其他脚本可监听)</summary>
    public UnityEvent<PartyGameMessage> OnMessageReceivedEvent;

    // ── 内部消息队列 (主线程安全) ──
    private readonly Queue<string> _messageQueue = new Queue<string>();
    private readonly object _queueLock = new object();

    #region Unity 生命周期

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);

        if (OnMessageReceivedEvent == null)
            OnMessageReceivedEvent = new UnityEvent<PartyGameMessage>();

        Debug.Log("[PartyGameBridge] Initialized — v0.2.5");
    }

    void Update()
    {
        lock (_queueLock) {
            while (_messageQueue.Count > 0)
                ProcessMessage(_messageQueue.Dequeue());
        }
    }

    void OnDestroy() { if (Instance == this) Instance = null; }

    #endregion

    #region JavaScript → Unity (被 jslib / SendMessage 调用)

    /// <summary>
    /// ★ 标准化入口: screen.html 通过 SendMessage("PartyGameBridge","OnPlatformMessage",json) 调用
    /// </summary>
    public void OnPlatformMessage(string jsonMessage)
    {
        lock (_queueLock) { _messageQueue.Enqueue(jsonMessage); }
    }

    /// <summary>
    /// ★ 兼容入口: jslib 可直接调用此方法
    /// </summary>
    public void OnMessageReceived(string jsonMessage) => OnPlatformMessage(jsonMessage);

    void ProcessMessage(string json)
    {
        try
        {
            if (enableDebugLog) Debug.Log($"[PartyGameBridge] ← JS: {json}");

            var msg = JsonUtility.FromJson<PartyGameMessage>(json);
            if (msg == null || string.IsNullOrEmpty(msg.type)) {
                Debug.LogWarning($"[PartyGameBridge] Invalid message: {json}");
                return;
            }

            OnMessageReceivedEvent?.Invoke(msg);
        }
        catch (Exception e) {
            Debug.LogError($"[PartyGameBridge] Error: {e.Message}\n  msg={json}");
        }
    }

    #endregion

    #region Unity → JavaScript (发送 broadcast)

    /// <summary>
    /// 广播分数更新
    /// </summary>
    public void BroadcastScoreUpdate(Dictionary<int, int> scores)
    {
        var entries = new List<string>();
        foreach (var kv in scores) entries.Add($"\"{kv.Key}\":{kv.Value}");
        Broadcast(
            PartyGameTypes.STATE_SCORE_UPDATE,
            JsonUtility.ToJson(new ScoreUpdateBroadcast { scores = "{" + string.Join(",", entries) + "}" })
        );
    }

    /// <summary>
    /// 广播游戏结束
    /// </summary>
    public void BroadcastGameOver(int finalScore, int winnerIndex)
    {
        Broadcast(
            PartyGameTypes.STATE_GAME_OVER,
            JsonUtility.ToJson(new GameOverBroadcast { finalScore = finalScore, winnerIndex = winnerIndex })
        );
    }

    /// <summary>
    /// 通用广播 (Unity → server → 所有 controllers)
    /// </summary>
    public void Broadcast(string type, string dataJson)
    {
        if (!Application.isPlaying) return;

        // 构建 { event:"broadcast", type:"...", data:"..." }
        var wrapper = new BroadcastWrapper
        {
            @event = "broadcast",
            type   = type,
            data   = dataJson
        };

        string json = JsonUtility.ToJson(wrapper);

        if (enableDebugLog) Debug.Log($"[PartyGameBridge] → JS broadcast: {json}");

#if UNITY_WEBGL && !UNITY_EDITOR
        SendToJavaScript(json);
#else
        Debug.Log($"[PartyGameBridge] [Editor Mock] Broadcast: {json}");
#endif
    }

    #endregion

    #region WebGL Native 调用

#if UNITY_WEBGL && !UNITY_EDITOR
    [System.Runtime.InteropServices.DllImport("__Internal")]
    private static extern void SendToJavaScript(string jsonMessage);
#endif

    #endregion
}

/// <summary>广播包装器 (JsonUtility 序列化用)</summary>
[Serializable]
public class BroadcastWrapper
{
    public string @event;
    public string type;
    public string data;
}
