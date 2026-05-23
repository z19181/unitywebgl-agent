using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 游戏管理器 - 核心控制器
/// 负责：
/// 1. 监听 PartyGameBridge 消息
/// 2. 管理玩家状态
/// 3. 处理 input.charge_start / input.charge_end
/// 4. 协调游戏逻辑
/// 5. 调用广播（落地成功后广播 state.score_update）
/// </summary>
public class GameManager : MonoBehaviour
{
    [Header("游戏设置")]
    [Tooltip("最大玩家数量")]
    public int maxPlayers = 4;
    
    [Tooltip("平台间距范围（最小，最大）")]
    public Vector2 platformDistanceRange = new Vector2(3f, 6f);
    
    [Tooltip("跳跃力度范围（最小力度对应0%蓄力，最大力度对应100%蓄力）")]
    public Vector2 jumpForceRange = new Vector2(5f, 15f);
    
    [Header("引用")]
    [Tooltip("玩家预制体")]
    public GameObject playerPrefab;
    
    [Tooltip("平台预制体")]
    public GameObject platformPrefab;
    
    [Tooltip("玩家生成位置")]
    public Transform playerSpawnPoint;
    
    // 游戏状态
    private Dictionary<int, PlayerController> players = new Dictionary<int, PlayerController>();
    private Dictionary<int, int> scores = new Dictionary<int, int>();
    private List<GameObject> platforms = new List<GameObject>();
    private int currentPlatformIndex = 0;
    
    #region Unity 生命周期
    
    private void Start()
    {
        // 初始化平台
        SpawnInitialPlatforms();
        
        // 监听消息
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPartyGameMessage);
        }
        
        Debug.Log("[GameManager] Initialized");
    }
    
    private void OnDestroy()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.RemoveListener(OnPartyGameMessage);
        }
    }
    
    #endregion
    
    #region 消息处理（第 3 条要求）
    
    private void OnPartyGameMessage(PartyGameMessage message)
    {
        if (message == null)
            return;
        
        // 只处理 game_message 类型
        if (message.@eventType != PartyGameEventTypes.GAME_MESSAGE)
        {
            // 不是 game_message，可能是 broadcast，忽略
            return;
        }
        
        // 根据消息类型分发处理
        switch (message.type)
        {
            case PartyGameMessageTypes.INPUT_CHARGE_START:
                HandleChargeStart(message);
                break;
                
            case PartyGameMessageTypes.INPUT_CHARGE_END:
                HandleChargeEnd(message);
                break;
                
            case PartyGameMessageTypes.INPUT_TAP:
                HandleTap(message);
                break;
                
            default:
                // 第 6 条要求：未知消息 type 必须安全忽略并打印 warning
                Debug.LogWarning($"[GameManager] Unknown message type: {message.type}");
                break;
        }
    }
    
    /// <summary>
    /// 处理 input.charge_start
    /// </summary>
    private void HandleChargeStart(PartyGameMessage message)
    {
        int playerIndex = message.playerIndex;
        
        if (!players.ContainsKey(playerIndex))
        {
            Debug.LogWarning($"[GameManager] ChargeStart from unknown player: {playerIndex}");
            return;
        }
        
        // 通知玩家开始蓄力
        players[playerIndex].StartCharge();
        
        Debug.Log($"[GameManager] Player {playerIndex} started charging");
    }
    
    /// <summary>
    /// 处理 input.charge_end（第 3 条要求）
    /// </summary>
    private void HandleChargeEnd(PartyGameMessage message)
    {
        int playerIndex = message.playerIndex;
        
        if (!players.ContainsKey(playerIndex))
        {
            Debug.LogWarning($"[GameManager] ChargeEnd from unknown player: {playerIndex}");
            return;
        }
        
        // 解析蓄力力度
        InputChargeEndData data = message.ParseData<InputChargeEndData>();
        if (data == null)
        {
            Debug.LogWarning($"[GameManager] Failed to parse charge_end data from player {playerIndex}");
            return;
        }
        
        // 验证力度范围（第 1 条要求：power 为 0 到 1）
        float power = Mathf.Clamp01(data.power);
        
        // 计算跳跃力度
        float jumpForce = Mathf.Lerp(jumpForceRange.x, jumpForceRange.y, power);
        
        // 通知玩家执行跳跃
        players[playerIndex].ExecuteJump(jumpForce);
        
        Debug.Log($"[GameManager] Player {playerIndex} jumped with power: {power}, force: {jumpForce}");
    }
    
    private void HandleTap(PartyGameMessage message)
    {
        int playerIndex = message.playerIndex;
        
        if (!players.ContainsKey(playerIndex))
        {
            Debug.LogWarning($"[GameManager] Tap from unknown player: {playerIndex}");
            return;
        }
        
        // Tap 作为一个简单的跳跃（固定力度）
        float jumpForce = jumpForceRange.x;
        players[playerIndex].ExecuteJump(jumpForce);
        
        Debug.Log($"[GameManager] Player {playerIndex} tapped (simple jump)");
    }
    
    #endregion
    
    #region 玩家管理
    
    /// <summary>
    /// 注册玩家（当玩家加入时调用）
    /// </summary>
    public void RegisterPlayer(int playerIndex, PlayerController player)
    {
        if (players.ContainsKey(playerIndex))
        {
            Debug.LogWarning($"[GameManager] Player {playerIndex} already registered");
            return;
        }
        
        players[playerIndex] = player;
        scores[playerIndex] = 0;
        
        // 设置玩家的索引（供 PlayerController 使用）
        player.SetPlayerIndex(playerIndex);
        
        Debug.Log($"[GameManager] Player {playerIndex} registered");
    }
    
    /// <summary>
    /// 玩家成功着陆 - 加分并广播（第 4 条要求）
    /// </summary>
    public void OnPlayerLanded(int playerIndex)
    {
        if (!scores.ContainsKey(playerIndex))
            return;
        
        // 加分
        scores[playerIndex]++;
        
        Debug.Log($"[GameManager] Player {playerIndex} landed! Score: {scores[playerIndex]}");
        
        // 广播分数更新（第 4 条要求：Unity 落地成功后广播 state.score_update）
        if (PartyGameBridge.Instance != null)
        {
            Debug.Log($"[Unity] Broadcast state.score_update: playerIndex={playerIndex}, score={scores[playerIndex]}");
            PartyGameBridge.Instance.BroadcastScoreUpdate(scores);
            Debug.Log($"[GameManager] Broadcasted score update: {scores[playerIndex]}");
        }
    }
    
    /// <summary>
    /// 玩家掉落 - 游戏结束
    /// </summary>
    public void OnPlayerFell(int playerIndex)
    {
        Debug.Log($"[GameManager] Player {playerIndex} fell! Final score: {scores[playerIndex]}");
        
        // 广播游戏结束
        if (PartyGameBridge.Instance != null)
        {
            int winnerIndex = GetWinnerIndex();
            PartyGameBridge.Instance.BroadcastGameOver(scores[playerIndex], winnerIndex);
        }
    }
    
    private int GetWinnerIndex()
    {
        int winner = 0;
        int maxScore = -1;
        
        foreach (var kvp in scores)
        {
            if (kvp.Value > maxScore)
            {
                maxScore = kvp.Value;
                winner = kvp.Key;
            }
        }
        
        return winner;
    }
    
    #endregion
    
    #region 平台管理
    
    private void SpawnInitialPlatforms()
    {
        // 第一个平台（起始平台）
        Vector3 spawnPos = playerSpawnPoint.position + Vector3.down * 0.5f;
        GameObject firstPlatform = Instantiate(platformPrefab, spawnPos, Quaternion.identity);
        firstPlatform.name = "Platform_0";
        platforms.Add(firstPlatform);
        
        // 生成第二个平台
        SpawnNextPlatform();
    }
    
    private void SpawnNextPlatform()
    {
        currentPlatformIndex++;
        
        // 随机距离
        float distance = Random.Range(platformDistanceRange.x, platformDistanceRange.y);
        Vector3 lastPlatformPos = platforms[platforms.Count - 1].transform.position;
        Vector3 spawnPos = lastPlatformPos + Vector3.right * distance;
        
        GameObject platform = Instantiate(platformPrefab, spawnPos, Quaternion.identity);
        platform.name = $"Platform_{currentPlatformIndex}";
        platforms.Add(platform);
        
        Debug.Log($"[GameManager] Spawned platform {currentPlatformIndex} at {spawnPos}");
    }
    
    /// <summary>
    /// 获取下一个平台的位置（供 PlayerController 调用）
    /// </summary>
    public Vector3 GetNextPlatformPosition
    {
        // 简化：总是跳向下一个平台
        if (platforms.Count < 2)
            return Vector3.zero;
        
        // 这里应该根据实际玩家位置来判断，简化版本返回最后一个平台
        return platforms[platforms.Count - 1].transform.position;
    }
    
    #endregion
}
