using System;
using UnityEngine;

/// <summary>
/// PartyGameSDK 消息定义
/// 用于 Unity ↔ JavaScript 通信
/// 
/// JSON 格式：
/// {
///   "event": "game_message",  // ← 注意：JSON 中使用 "event"
///   "type": "input.charge_end",
///   "playerIndex": 0,
///   "data": "{}"
/// }
/// 
/// C# 中 `event` 是关键字，所以用 @event 作为字段名
/// JsonUtility 会正确映射 "event" → @event
/// </summary>
[Serializable]
public class PartyGameMessage
{
    /// <summary>
    /// 事件类型（JSON 字段名："event"）
    /// 值："game_message" 或 "broadcast"
    /// </summary>
    public string @event;  // ← 对应 JSON 的 "event" 字段
    
    /// <summary>
    /// 消息类型（如 "input.charge_start", "state.score_update"）
    /// </summary>
    public string type;
    
    /// <summary>
    /// 玩家索引（由服务器注入，客户端不能伪造）
    /// </summary>
    public int playerIndex;
    
    /// <summary>
    /// 数据字段（JSON 字符串，需要手动解析）
    /// </summary>
    public string data;
    
    /// <summary>
    /// 解析 data 字段为指定类型
    /// </summary>
    public T ParseData<T>() where T : class
    {
        if (string.IsNullOrEmpty(data))
            return null;
        
        try
        {
            return JsonUtility.FromJson<T>(data);
        }
        catch (Exception e)
        {
            Debug.LogError($"[PartyGameMessage] Failed to parse data: {e.Message}");
            return null;
        }
    }
}

/// <summary>
/// 事件类型常量（对应 JSON 的 "event" 字段）
/// </summary>
public static class PartyGameEventTypes
{
    public const string GAME_MESSAGE = "game_message";
    public const string BROADCAST = "broadcast";
}

/// <summary>
/// 消息类型常量（对应 "type" 字段）
/// </summary>
public static class PartyGameMessageTypes
{
    // 输入消息（controller → server → Unity）
    public const string INPUT_CHARGE_START = "input.charge_start";
    public const string INPUT_CHARGE_END = "input.charge_end";
    public const string INPUT_TAP = "input.tap";
    
    // 状态消息（Unity → server → controllers）
    public const string STATE_SCORE_UPDATE = "state.score_update";
    public const string STATE_GAME_OVER = "state.game_over";
    
    // 系统消息
    public const string PLAYER_JOINED = "player_joined";
    public const string PLAYER_LEFT = "player_left";
}

/// <summary>
/// 输入消息数据结构
/// </summary>
[Serializable]
public class InputChargeEndData
{
    public float power;  // 0.0 ~ 1.0
}

[Serializable]
public class InputTapData
{
    // Tap 没有额外数据
}

/// <summary>
/// 广播消息数据结构
/// </summary>
[Serializable]
public class ScoreUpdateData
{
    public string scores;  // JSON 对象字符串，如 {"0":1,"1":2}
}

[Serializable]
public class GameOverData
{
    public int finalScore;
    public int winnerIndex;
}
