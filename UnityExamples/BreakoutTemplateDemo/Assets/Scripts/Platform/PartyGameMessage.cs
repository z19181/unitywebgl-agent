using System;
using UnityEngine;

/// <summary>
/// PartyGameSDK 消息定义 —— v0.2.5 标准化
/// 
/// JSON 格式 (server 转发给 Unity 的 game_message):
/// {
///   "event": "game_message",
///   "type": "input.tap",
///   "playerIndex": 0,        // ← server 注入，不可伪造
///   "data": "{}"             // ← 可选的 JSON 字符串
/// }
/// 
/// ⚠️ C# 中 "event" 是关键字 → 使用 @event 字段名
///    JsonUtility 自动映射 JSON "event" ↔ C# @event
/// </summary>
[Serializable]
public class PartyGameMessage
{
    public string @event;    // JSON → "event": "game_message" / "broadcast"
    public string type;      // JSON → "type": "input.tap" / "state.score_update"
    public int playerIndex;  // JSON → "playerIndex": 0  (由 server 注入)
    public string data;      // JSON → "data": "{\"power\":0.5}"  (可选)

    /// <summary>
    /// 解析 data 字段为指定类型
    /// 用法: var charge = message.ParseData<InputChargeEndData>();
    /// </summary>
    public T ParseData<T>() where T : class
    {
        if (string.IsNullOrEmpty(data)) return null;
        try { return JsonUtility.FromJson<T>(data); }
        catch (Exception e) {
            Debug.LogError($"[PartyGameMessage] ParseData<{typeof(T).Name}> failed: {e.Message}");
            return null;
        }
    }

    /// <summary>
    /// 尝试解析 data 为 float (用于简单的数值型数据)
    /// </summary>
    public float ParseDataFloat(float fallback = 0f)
    {
        if (string.IsNullOrEmpty(data)) return fallback;
        if (float.TryParse(data, out float v)) return v;
        return fallback;
    }

    public override string ToString() => $"[{type}] PI={playerIndex} data={data}";
}

// ── 输入数据结构 (controller 发送的 data 字段) ──

[Serializable]
public class InputChargeEndData  { public float power; }

[Serializable]
public class InputMoveData      { public float x; }

[Serializable]
public class InputTapData       { /* tap 无额外数据 */ }

// ── 广播数据结构 (Unity 发出的 data 字段) ──

[Serializable]
public class ScoreUpdateBroadcast
{
    public string scores;  // JSON 对象: {"0":1,"1":3}
}

[Serializable]
public class GameOverBroadcast
{
    public int finalScore;
    public int winnerIndex;
}

// ── 系统消息数据结构 ──

[Serializable]
public class PlayerJoinedData
{
    public int playerIndex;
    public string playerName;
    public int playerCount;
}

[Serializable]
public class PlayerLeftData
{
    public int playerIndex;
    public int playerCount;
}

[Serializable]
public class PlayerReconnectedData
{
    public int playerIndex;
    public string playerName;
    public int playerCount;
}
