using System;
using UnityEngine;

/// <summary>
/// PartyGameSDK 消息类型常量
/// 标准化 —— v0.2.5
/// </summary>
public static class PartyGameTypes
{
    // ── 输入消息 (controller → server → Unity) ──
    public const string INPUT_TAP        = "input.tap";
    public const string INPUT_MOVE       = "input.move";
    public const string INPUT_CHARGE_START = "input.charge_start";
    public const string INPUT_CHARGE_END   = "input.charge_end";

    // ── 状态广播 (Unity → server → controllers) ──
    public const string STATE_SCORE_UPDATE = "state.score_update";
    public const string STATE_GAME_OVER    = "state.game_over";

    // ── 反馈广播 (Unity → controllers，可选) ──
    public const string FEEDBACK_HIT   = "feedback.hit";
    public const string FEEDBACK_DEATH = "feedback.death";

    // ── 系统事件 ──
    public const string PLAYER_JOINED  = "player_joined";
    public const string PLAYER_LEFT    = "player_left";
    public const string PLAYER_RECONNECTED = "player_reconnected";
}
