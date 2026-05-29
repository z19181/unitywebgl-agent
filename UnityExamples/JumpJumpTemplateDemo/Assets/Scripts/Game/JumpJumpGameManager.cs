using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

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

    private const string STATE_WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS";
    private const string STATE_GAME_RUNNING = "GAME_RUNNING";
    private const string STATE_GAME_OVER = "GAME_OVER";

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
    private string currentState = STATE_WAITING_FOR_PLAYERS;
    private bool receivedAnyMessage = false;
    private bool receiverHit = false;
    private string lastMessageType = "none";
    private int lastMessagePlayerIndex = -1;
    private string lastMessageSummary = "Waiting for players...";
    private int visibleTick = 0;
    private string pendingUnityAckJson = null;
    private GameObject debugReactionMarker = null;
    private GUIStyle debugBoxStyle;
    private GUIStyle debugLabelStyle;
    private Text sceneStatusText = null;
    private Text sceneScoreText = null;
    private Text scenePowerText = null;
    private GameObject runtimeOverlayRoot = null;
    private Text runtimeOverlayText = null;
    private Image runtimeOverlayPanel = null;

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
        currentState = STATE_WAITING_FOR_PLAYERS;
        receiverHit = false;
        visibleTick = 0;
        CacheSceneUIText();
        EnsureRuntimeOverlay();
        EnsureDebugReactionMarker(Color.white);

        if (uiManager != null)
        {
            uiManager.UpdateScore(0);
            uiManager.UpdatePower(0f);
            uiManager.HideGameOver();
        }
        SetVisibleStatus("Waiting for players...");
        SetVisibleScore(0);
        SetVisiblePower(0f);
        UpdateRuntimeOverlay("Waiting for players...");

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
        if (msg == null)
        {
            Debug.LogWarning("[UnityReceive] null message received");
            pendingUnityAckJson = PartyGameBridge.BuildUnityAckJson(false, "unknown", -1, PlayerCount, CurrentState, "NULL_MESSAGE", 0);
            return;
        }

        int pi = msg.playerIndex;

        Debug.Log($"[JumpJump] ← msg: type={msg.type}, PI={pi}");
        Debug.Log($"[UnityReceive] raw={msg} type={msg.type} playerIndex={pi}");

        receivedAnyMessage = true;
        receiverHit = true;
        visibleTick++;
        lastMessageType = msg.type ?? "unknown";
        lastMessagePlayerIndex = pi;
        lastMessageSummary = $"Last message: {lastMessageType}";

        SetVisibleStatus($"{lastMessageSummary} (P{pi})");
        UpdateRuntimeOverlay($"{lastMessageSummary} (P{pi})");

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

            default:
                Debug.LogWarning($"[UnityReceive] unknown type: {msg.type}");
                break;
        }

        pendingUnityAckJson = PartyGameBridge.BuildUnityAckJson(true, msg.type, msg.playerIndex, PlayerCount, CurrentState, null, 0);

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

        currentState = STATE_GAME_RUNNING;
        var player = players[playerIndex];
        ForceVisibleGameplay(playerIndex, player, Color.yellow, 1.6f);
        EnsureDebugReactionMarker(Color.yellow);
        player.StartCharge();
        lastMessageSummary = $"Game running • charge_start P{playerIndex}";
        SetVisibleStatus(lastMessageSummary);
        UpdateRuntimeOverlay(lastMessageSummary);
        if (uiManager != null) uiManager.HideGameOver();
        Debug.Log($"[JumpJump] P{playerIndex} charge_start");
    }

    void HandleChargeEnd(int playerIndex, float power)
    {
        if (isGameOver) return;
        if (!players.ContainsKey(playerIndex)) SpawnPlayer(playerIndex);

        currentState = STATE_GAME_RUNNING;
        var player = players[playerIndex];
        ForceVisibleGameplay(playerIndex, player, Color.cyan, 1.75f);
        EnsureDebugReactionMarker(Color.cyan);
        player.EndCharge();
        lastMessageSummary = $"Game running • charge_end P{playerIndex}";
        SetVisibleStatus(lastMessageSummary);
        UpdateRuntimeOverlay(lastMessageSummary);
        if (uiManager != null) uiManager.HideGameOver();
        Debug.Log($"[JumpJump] P{playerIndex} charge_end power={power:F2}");
    }

    void HandleTap(int playerIndex)
    {
        if (isGameOver) return;
        if (!players.ContainsKey(playerIndex)) SpawnPlayer(playerIndex);

        currentState = STATE_GAME_RUNNING;
        var p = players[playerIndex];
        ForceVisibleGameplay(playerIndex, p, Color.green, 1.8f);
        EnsureDebugReactionMarker(Color.green);
        if (p.CurrentState == PlayerJump.State.Idle)
            p.TapJump();
        lastMessageSummary = $"Game running • tap P{playerIndex}";
        SetVisibleStatus(lastMessageSummary);
        UpdateRuntimeOverlay(lastMessageSummary);
        if (uiManager != null) uiManager.HideGameOver();
        Debug.Log($"[JumpJump] P{playerIndex} tap");
    }

    // ─────────────────────────────────────
    // 玩家管理
    // ─────────────────────────────────────

    void SpawnPlayer(int playerIndex)
    {
        Vector3 spawnPos = spawnPointRoot != null ? spawnPointRoot.position : Vector3.up * 2;
        GameObject go;
        if (playerPrefab != null)
        {
            go = Instantiate(playerPrefab, spawnPos, Quaternion.identity);
        }
        else
        {
            Debug.LogWarning("[JumpJump] playerPrefab is null, using cube fallback.");
            go = GameObject.CreatePrimitive(PrimitiveType.Cube);
            go.transform.position = spawnPos;
        }
        go.name = $"Player_{playerIndex}";
        go.transform.localScale = Vector3.one * 1.15f;

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

        FocusCameraOn(go.transform);
        PaintVisible(go, GetColor(playerIndex));

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
        currentState = STATE_GAME_OVER;

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

        FlushPendingUnityAck();

        if (receiverHit && debugReactionMarker != null)
        {
            var pulse = 1f + Mathf.Sin(Time.time * 8f) * 0.08f;
            debugReactionMarker.transform.localScale = Vector3.one * (1.35f * pulse);
        }
    }

    void OnGUI()
    {
        if (debugBoxStyle == null)
        {
            debugBoxStyle = new GUIStyle(GUI.skin.box)
            {
                fontSize = 14,
                alignment = TextAnchor.UpperLeft,
                normal =
                {
                    textColor = Color.white
                },
                padding = new RectOffset(12, 12, 10, 10)
            };
        }

        if (debugLabelStyle == null)
        {
            debugLabelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                alignment = TextAnchor.UpperLeft,
                wordWrap = true,
                normal =
                {
                    textColor = Color.white
                }
            };
        }

        var areaWidth = 320f;
        var areaHeight = 150f;
        var areaX = Mathf.Max(12f, (Screen.width - areaWidth) * 0.5f);
        var area = new Rect(areaX, 12f, areaWidth, areaHeight);
        var prevContentColor = GUI.contentColor;
        GUI.contentColor = receiverHit ? new Color(0.35f, 1f, 0.45f) : Color.white;
        GUI.Box(area, GUIContent.none, debugBoxStyle);
        GUILayout.BeginArea(new Rect(area.x + 12f, area.y + 10f, area.width - 24f, area.height - 20f));
        GUILayout.Label("Unity ready: yes", debugLabelStyle);
        GUILayout.Label($"Receiver hit: {(receiverHit ? "yes" : "no")}", debugLabelStyle);
        GUILayout.Label($"Last message: {lastMessageType}", debugLabelStyle);
        GUILayout.Label($"Game state: {currentState}", debugLabelStyle);
        GUILayout.Label($"Player count: {players.Count}", debugLabelStyle);
        GUILayout.Label($"Last playerIndex: {(receivedAnyMessage ? lastMessagePlayerIndex.ToString() : "-")}", debugLabelStyle);
        GUILayout.Label($"Visible tick: {visibleTick}", debugLabelStyle);
        GUILayout.EndArea();
        GUI.contentColor = prevContentColor;
    }

    public string CurrentState => currentState;
    public int PlayerCount => players.Count;

    private void FlushPendingUnityAck()
    {
        if (string.IsNullOrEmpty(pendingUnityAckJson))
            return;

        if (PartyGameBridge.Instance == null)
            return;

        var ackJson = pendingUnityAckJson;
        pendingUnityAckJson = null;
        Debug.Log($"[JumpJump] → JS ACK flush: {ackJson}");
        PartyGameBridge.Instance.SendUnityAckJson(ackJson);
    }

    private void ForceVisibleGameplay(int playerIndex, PlayerJump player, Color brightColor, float scaleMultiplier)
    {
        if (player == null) return;

        receiverHit = true;
        currentState = STATE_GAME_RUNNING;

        var visiblePos = new Vector3(0f, 1.5f + 0.1f * playerIndex, 0f);
        player.transform.position = visiblePos;
        player.transform.localScale = Vector3.one * scaleMultiplier;
        PaintVisible(player.gameObject, brightColor);
        FocusCameraOn(player.transform);
    }

    private void EnsureDebugReactionMarker(Color markerColor)
    {
        var cam = Camera.main;
        if (cam == null)
            return;

        if (debugReactionMarker == null)
        {
            debugReactionMarker = GameObject.CreatePrimitive(PrimitiveType.Cube);
            debugReactionMarker.name = "DebugReactionMarker";

            var collider = debugReactionMarker.GetComponent<Collider>();
            if (collider != null) Destroy(collider);

            debugReactionMarker.transform.SetParent(cam.transform, false);
            debugReactionMarker.transform.localPosition = new Vector3(0f, 0f, 3f);
            debugReactionMarker.transform.localRotation = Quaternion.identity;
            debugReactionMarker.transform.localScale = Vector3.one * 1.35f;
        }

        debugReactionMarker.SetActive(true);

        var renderer = debugReactionMarker.GetComponentInChildren<Renderer>();
        if (renderer != null && renderer.material != null)
        {
            renderer.material.color = markerColor;
        }
    }

    private void PaintVisible(GameObject go, Color brightColor)
    {
        if (go == null) return;

        var renderer = go.GetComponentInChildren<Renderer>();
        if (renderer != null && renderer.material != null)
        {
            renderer.material.color = brightColor;
        }
    }

    private void FocusCameraOn(Transform target)
    {
        if (target == null) return;

        if (cameraFollow != null)
        {
            cameraFollow.offset = new Vector3(0f, 4f, -8f);
            cameraFollow.smoothSpeed = Mathf.Max(cameraFollow.smoothSpeed, 10f);
            cameraFollow.SetTarget(target);
        }

        var cam = Camera.main;
        if (cam != null)
        {
            cam.transform.position = new Vector3(0f, 4f, -8f);
            cam.transform.LookAt(new Vector3(0f, 1f, 0f));
        }
    }

    private void CacheSceneUIText()
    {
        sceneStatusText = null;
        sceneScoreText = null;
        scenePowerText = null;

        var texts = Resources.FindObjectsOfTypeAll<Text>();
        foreach (var text in texts)
        {
            if (text == null || text.gameObject == null)
                continue;

            if (!text.gameObject.scene.IsValid() || !text.gameObject.scene.isLoaded)
                continue;

            var value = text.text ?? string.Empty;
            if (sceneStatusText == null && (value.Contains("Waiting for players") || value.Contains("Last message:") || value.Contains("Game running")))
            {
                sceneStatusText = text;
                continue;
            }

            if (sceneScoreText == null && value.StartsWith("Score:"))
            {
                sceneScoreText = text;
                continue;
            }

            if (scenePowerText == null && value.StartsWith("Power:"))
            {
                scenePowerText = text;
            }
        }
    }

    private void SetVisibleStatus(string status)
    {
        if (uiManager != null)
        {
            uiManager.UpdateStatus(status);
        }

        if (sceneStatusText == null)
        {
            CacheSceneUIText();
        }

        if (sceneStatusText != null)
        {
            sceneStatusText.text = status;
            sceneStatusText.color = receiverHit ? new Color(0.35f, 1f, 0.45f) : Color.white;
        }
    }

    private void EnsureRuntimeOverlay()
    {
        if (runtimeOverlayRoot != null)
            return;

        runtimeOverlayRoot = new GameObject("RuntimeOverlayCanvas");
        var canvas = runtimeOverlayRoot.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 5000;
        runtimeOverlayRoot.AddComponent<CanvasScaler>();
        runtimeOverlayRoot.AddComponent<GraphicRaycaster>();

        var panel = new GameObject("RuntimeOverlayPanel");
        panel.transform.SetParent(runtimeOverlayRoot.transform, false);
        runtimeOverlayPanel = panel.AddComponent<Image>();
        runtimeOverlayPanel.color = new Color(0f, 0f, 0f, 0.65f);

        var panelRect = runtimeOverlayPanel.rectTransform;
        panelRect.anchorMin = new Vector2(0.5f, 1f);
        panelRect.anchorMax = new Vector2(0.5f, 1f);
        panelRect.pivot = new Vector2(0.5f, 1f);
        panelRect.anchoredPosition = new Vector2(0f, -16f);
        panelRect.sizeDelta = new Vector2(640f, 150f);

        var textObj = new GameObject("RuntimeOverlayText");
        textObj.transform.SetParent(panel.transform, false);
        runtimeOverlayText = textObj.AddComponent<Text>();
        runtimeOverlayText.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        runtimeOverlayText.fontSize = 24;
        runtimeOverlayText.alignment = TextAnchor.MiddleCenter;
        runtimeOverlayText.color = Color.white;
        runtimeOverlayText.horizontalOverflow = HorizontalWrapMode.Wrap;
        runtimeOverlayText.verticalOverflow = VerticalWrapMode.Overflow;

        var textRect = runtimeOverlayText.rectTransform;
        textRect.anchorMin = Vector2.zero;
        textRect.anchorMax = Vector2.one;
        textRect.offsetMin = new Vector2(24f, 16f);
        textRect.offsetMax = new Vector2(-24f, -16f);
    }

    private void UpdateRuntimeOverlay(string status)
    {
        EnsureRuntimeOverlay();

        if (runtimeOverlayText != null)
        {
            runtimeOverlayText.text =
                $"Unity ready: yes\n" +
                $"Receiver hit: {(receiverHit ? "yes" : "no")}\n" +
                $"Last message: {lastMessageType}\n" +
                $"Status: {status}\n" +
                $"Player count: {players.Count}  |  Visible tick: {visibleTick}";
            runtimeOverlayText.color = receiverHit ? new Color(0.8f, 1f, 0.85f) : Color.white;
        }

        if (runtimeOverlayPanel != null)
        {
            runtimeOverlayPanel.color = receiverHit ? new Color(0.05f, 0.2f, 0.05f, 0.82f) : new Color(0f, 0f, 0f, 0.65f);
        }
    }

    private void SetVisibleScore(int score)
    {
        if (uiManager != null)
        {
            uiManager.UpdateScore(score);
        }

        if (sceneScoreText == null)
        {
            CacheSceneUIText();
        }

        if (sceneScoreText != null)
        {
            sceneScoreText.text = $"Score: {score}";
        }
    }

    private void SetVisiblePower(float power)
    {
        if (uiManager != null)
        {
            uiManager.UpdatePower(power);
        }

        if (scenePowerText == null)
        {
            CacheSceneUIText();
        }

        if (scenePowerText != null)
        {
            scenePowerText.text = $"Power: {power:P0}";
        }
    }

}
