using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// JumpJump GameManager — v0.2.6 PartyGameSDK Demo
/// 
/// 功能:
///   1. 接收 server 注入的 game_message（input.charge_start/input.charge_end/input.tap）
///   2. 控制玩家跳跃 / 分数 / 游戏结束
///   3. 广播 state.score_update / state.game_over
/// 
/// 五条铁律:
///   ✅ controller 只发 input.xxx → 已验证（server 注入 playerIndex）
///   ✅ Unity 只处理 server 注入 playerIndex 后的消息
///   ✅ Unity 只通过 broadcast 发 state.xxx
///   ✅ controller 只更新 UI（由 server 广播）
/// </summary>
public class JumpJumpGameManager : MonoBehaviour
{
    public static JumpJumpGameManager Instance { get; private set; }

    [Header("玩家")]
    public GameObject playerPrefab;

    [Header("游戏设置")]
    public int scorePerPlatform = 10;
    public int maxPlayers = 4;

    [Header("UI")]
    public UIManager uiManager;

    [Header("平台")]
    public PlatformSpawner platformSpawner;

    [Header("相机")]
    public CameraFollow cameraFollow;

    [Header("场景")]
    public Transform spawnPointRoot;

    // ── 运行时状态 ──
    private Dictionary<int, PlayerJump> players = new Dictionary<int, PlayerJump>();
    private Dictionary<int, int> scores = new Dictionary<int, int>();
    private Dictionary<int, Color> playerColors = new Dictionary<int, Color>();
    private bool isGameOver = false;

    // 预定义颜色
    private static readonly Color[] Colors = {
        new Color(1f, 0.3f, 0.3f),   // Red
        new Color(0.3f, 0.5f, 1f),   // Blue
        Color.green,
        Color.yellow,
        Color.magenta,
        Color.cyan,
        Color.white,
        new Color(1f, 0.6f, 0f),     // Orange
    };

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
    }

    void Start()
    {
        Debug.Log("[JumpJumpGameManager] Initialized — v0.2.6");

        // Listen to PartyGameBridge
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage);
        }
    }

    void OnDestroy()
    {
        if (PartyGameBridge.Instance != null)
            PartyGameBridge.Instance.OnMessageReceivedEvent.RemoveListener(OnPlatformMessage);
        if (Instance == this) Instance = null;
    }

    // ─────────────────────────────────────
    // 消息入口（server 转发 → Unity）
    // ─────────────────────────────────────

    /// <summary>
    /// ★ 接收 server 转发的 game_message
    /// playerIndex 已由 server 注入，不可伪造
    /// </summary>
    public void OnPlatformMessage(PartyGameMessage msg)
    {
        int pi = msg.playerIndex;

        Debug.Log($"[JumpJump] ← msg: type={msg.type}, PI={pi}");

        switch (msg.type)
        {
            case "input.charge_start":
                HandleChargeStart(pi);
                break;

            case "input.charge_end":
                var chargeData = msg.ParseData<InputChargeEndData>();
                HandleChargeEnd(pi, chargeData?.power ?? 0.5f);
                break;

            case "input.tap":
                HandleTap(pi);
                break;
        }
    }

    // ─────────────────────────────────────
    // 输入处理
    // ─────────────────────────────────────

    void HandleChargeStart(int playerIndex)
    {
        if (isGameOver) return;

        // Spawn player if not exists
        if (!players.ContainsKey(playerIndex))
            SpawnPlayer(playerIndex);

        players[playerIndex].StartCharge();
        Debug.Log($"[JumpJump] P{playerIndex} charge_start");
    }

    void HandleChargeEnd(int playerIndex, float power)
    {
        if (isGameOver) return;
        if (!players.ContainsKey(playerIndex)) SpawnPlayer(playerIndex);

        players[playerIndex].EndCharge();
        Debug.Log($"[JumpJump] P{playerIndex} charge_end power={power:F2}");
    }

    void HandleTap(int playerIndex)
    {
        if (isGameOver) return;
        if (!players.ContainsKey(playerIndex)) SpawnPlayer(playerIndex);

        var p = players[playerIndex];
        if (p.CurrentState == PlayerJump.State.Idle)
            p.TapJump();
        Debug.Log($"[JumpJump] P{playerIndex} tap");
    }

    // ─────────────────────────────────────
    // 玩家管理
    // ─────────────────────────────────────

    void SpawnPlayer(int playerIndex)
    {
        if (playerPrefab == null)
        {
            Debug.LogError("[JumpJump] playerPrefab is null!");
            return;
        }

        Vector3 spawnPos = spawnPointRoot != null ? spawnPointRoot.position : Vector3.up * 2;
        var go = Instantiate(playerPrefab, spawnPos, Quaternion.identity);
        go.name = $"Player_{playerIndex}";

        var pj = go.GetComponent<PlayerJump>();
        if (pj == null) pj = go.AddComponent<PlayerJump>();

        pj.playerIndex = playerIndex;
        pj.playerColor = GetColor(playerIndex);
        pj.SetSpawnPoint(spawnPointRoot);

        // 事件
        pj.OnLandedOnPlatform = (player) => OnPlayerLanded(player);
        pj.OnFellToDeath = (player) => OnPlayerDied(player);

        players[playerIndex] = pj;
        scores[playerIndex] = 0;

        // 相机跟随第一个玩家
        if (cameraFollow != null && cameraFollow.target == null)
            cameraFollow.SetTarget(go.transform);

        Debug.Log($"[JumpJump] P{playerIndex} spawned at {spawnPos}");
    }

    Color GetColor(int pi)
    {
        if (!playerColors.ContainsKey(pi))
            playerColors[pi] = Colors[pi % Colors.Length];
        return playerColors[pi];
    }

    // ─────────────────────────────────────
    // 游戏逻辑
    // ─────────────────────────────────────

    void OnPlayerLanded(PlayerJump player)
    {
        if (isGameOver) return;

        int pi = player.playerIndex;
        scores[pi] += scorePerPlatform;

        // 生成新平台
        if (platformSpawner != null)
            platformSpawner.SpawnNext();

        // ★ 广播分数更新
        BroadcastScoreUpdate();

        Debug.Log($"[JumpJump] P{pi} landed! Score: {scores[pi]}");
    }

    void OnPlayerDied(PlayerJump player)
    {
        if (isGameOver) return;

        int pi = player.playerIndex;
        int aliveCount = 0;
        foreach (var p in players.Values)
            if (p.CurrentState != PlayerJump.State.Dead) aliveCount++;

        Debug.Log($"[JumpJump] P{pi} died! Alive: {aliveCount}");

        // 所有玩家死亡 → 游戏结束
        if (aliveCount == 0)
        {
            EndGame();
        }
    }

    void EndGame()
    {
        if (isGameOver) return;
        isGameOver = true;

        // 找出赢家
        int winner = 0;
        int bestScore = 0;
        foreach (var kv in scores)
        {
            if (kv.Value > bestScore) { bestScore = kv.Value; winner = kv.Key; }
        }

        // ★ 广播游戏结束
        BroadcastGameOver(bestScore, winner);

        // UI
        if (uiManager != null)
        {
            uiManager.UpdateStatus($"🏁 Game Over! Winner: P{winner}");
            uiManager.ShowGameOver(bestScore);
        }

        Debug.Log($"[JumpJump] Game Over! Winner: P{winner}, Score: {bestScore}");
    }

    // ─────────────────────────────────────
    // 广播（Unity → server → controllers）
    // ─────────────────────────────────────

    void BroadcastScoreUpdate()
    {
        if (PartyGameBridge.Instance == null) return;
        PartyGameBridge.Instance.BroadcastScoreUpdate(scores);
    }

    void BroadcastGameOver(int finalScore, int winnerIndex)
    {
        if (PartyGameBridge.Instance == null) return;
        PartyGameBridge.Instance.BroadcastGameOver(finalScore, winnerIndex);
    }

    // ─────────────────────────────────────
    // 调试
    // ─────────────────────────────────────

    void Update()
    {
        // 更新蓄力 UI
        if (uiManager != null && players.Count > 0)
        {
            var firstPlayer = players.Values.GetEnumerator();
            if (firstPlayer.MoveNext())
            {
                var p = firstPlayer.Current;
                if (p != null && p.CurrentState == PlayerJump.State.Charging)
                {
                    uiManager.UpdatePower(p.GetChargeProgress());
                }
            }
        }
    }
}
