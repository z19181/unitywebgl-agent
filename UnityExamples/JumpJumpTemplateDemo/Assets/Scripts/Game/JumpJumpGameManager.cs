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

    private enum GameState
    {
        Waiting,
        Running,
        GameOver,
    }

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
    public SplitScreenCameraRig splitScreenRig;

    [Header("场景")]
    public Transform spawnPointRoot;

    // ── 运行时状态 ──
    private Dictionary<int, PlayerJump> players = new Dictionary<int, PlayerJump>();
    private Dictionary<int, int> scores = new Dictionary<int, int>();
    private Dictionary<int, Color> playerColors = new Dictionary<int, Color>();
    private bool isGameOver = false;
    private GameState gameState = GameState.Waiting;
    private bool receiverHit = false;
    private string lastMessageType = "none";
    private int lastPlayerIndex = -1;
    private int visibleTick = 0;
    private Canvas runtimeOverlayCanvas;
    private Image runtimePlayerSwatch;
    private Text runtimePlayerLabel;
    private Text runtimeStateLabel;

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

        EnsureSplitScreenRig();
        UpdateGameState(GameState.Waiting);
        if (uiManager != null)
        {
            uiManager.UpdateScore(0);
            uiManager.UpdatePower(0f);
            uiManager.HideGameOver();
        }
        EnsureRuntimeOverlay();
        UpdateRuntimeOverlay();

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
        receiverHit = true;
        lastMessageType = msg.type ?? "null";
        lastPlayerIndex = pi;
        UpdateRuntimeOverlay();

        if (gameState == GameState.GameOver && msg.type != "input.tap")
            return;

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
        if (!StartGameIfNeeded()) return;

        // Spawn player if not exists
        if (!players.ContainsKey(playerIndex))
            SpawnPlayer(playerIndex);

        players[playerIndex].StartCharge();
        Debug.Log($"[JumpJump] P{playerIndex} charge_start");
    }

    void HandleChargeEnd(int playerIndex, float power)
    {
        if (!StartGameIfNeeded()) return;
        if (!players.ContainsKey(playerIndex)) SpawnPlayer(playerIndex);

        players[playerIndex].EndCharge();
        Debug.Log($"[JumpJump] P{playerIndex} charge_end power={power:F2}");
    }

    void HandleTap(int playerIndex)
    {
        if (gameState == GameState.GameOver)
        {
            RestartGame();
            return;
        }

        if (!StartGameIfNeeded()) return;
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
        go.transform.localScale = Vector3.one * 2.0f;
        go.SetActive(true);

        var pj = go.GetComponent<PlayerJump>();
        if (pj == null) pj = go.AddComponent<PlayerJump>();

        pj.playerIndex = playerIndex;
        pj.playerColor = GetColor(playerIndex);
        pj.SetSpawnPoint(spawnPointRoot);

        // 事件
        pj.OnLandedOnPlatform = (player) => OnPlayerLanded(player);
        pj.OnFellToDeath = (player) => OnPlayerDied(player);

        EnsureVisibleMarker(go, pj.playerColor);
        EnsurePlayerLabel(go, playerIndex);
        ForceCameraFocus(go.transform);

        players[playerIndex] = pj;
        scores[playerIndex] = 0;

        // 相机跟随第一个玩家
        if (cameraFollow != null && (cameraFollow.target == null || playerIndex == 0))
            cameraFollow.SetTarget(go.transform);

        if (splitScreenRig != null)
            splitScreenRig.BindPlayer(playerIndex, go.transform);

        Debug.Log($"[JumpJump] P{playerIndex} spawned at {spawnPos}");
    }

    void EnsureVisibleMarker(GameObject playerRoot, Color color)
    {
        if (playerRoot == null) return;

        var existing = playerRoot.transform.Find("VisibleMarker");
        if (existing != null) return;

        var marker = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        marker.name = "VisibleMarker";
        marker.transform.SetParent(playerRoot.transform, false);
        marker.transform.localPosition = new Vector3(0f, 1.0f, 0f);
        marker.transform.localScale = new Vector3(3.0f, 3.0f, 3.0f);

        var collider = marker.GetComponent<Collider>();
        if (collider != null) Destroy(collider);

        var renderer = marker.GetComponent<Renderer>();
        if (renderer != null)
        {
            var shader = Shader.Find("Unlit/Color");
            if (shader == null) shader = Shader.Find("Standard");
            var material = new Material(shader);
            material.color = color;
            renderer.material = material;
        }
    }

    void EnsurePlayerLabel(GameObject playerRoot, int playerIndex)
    {
        if (playerRoot == null) return;

        var existing = playerRoot.transform.Find("PlayerLabel");
        if (existing != null) return;

        var label = new GameObject("PlayerLabel");
        label.transform.SetParent(playerRoot.transform, false);
        label.transform.localPosition = new Vector3(0f, 3.8f, 0f);
        label.transform.localScale = Vector3.one * 0.08f;

        var text = label.AddComponent<TextMesh>();
        text.text = $"P{playerIndex}";
        text.fontSize = 220;
        text.characterSize = 0.35f;
        text.anchor = TextAnchor.MiddleCenter;
        text.alignment = TextAlignment.Center;
        text.color = Color.white;
    }

    void ForceCameraFocus(Transform target)
    {
        if (target == null) return;

        if (cameraFollow != null)
        {
            cameraFollow.offset = new Vector3(0f, 2.5f, -4.5f);
            cameraFollow.smoothSpeed = 12f;
            cameraFollow.SetTarget(target);
        }

        if (splitScreenRig != null)
        {
            splitScreenRig.cameraOffset = new Vector3(0f, 2.5f, -4.5f);
            splitScreenRig.smoothSpeed = 12f;
            splitScreenRig.BindPlayer(0, target);
        }

        var cam = Camera.main;
        if (cam != null)
        {
            cam.fieldOfView = 45f;
            cam.transform.position = target.position + new Vector3(0f, 2.5f, -4.5f);
            cam.transform.LookAt(target.position + Vector3.up * 0.5f);
        }
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
        UpdateGameState(GameState.GameOver);

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
        UpdateRuntimeOverlay();

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

    private bool StartGameIfNeeded()
    {
        if (gameState == GameState.GameOver)
            return false;

        if (gameState == GameState.Waiting)
        {
            UpdateGameState(GameState.Running);
            if (uiManager != null)
            {
                uiManager.UpdateStatus("Running");
                uiManager.HideGameOver();
            }
        }
        visibleTick++;

        return true;
    }

    private void RestartGame()
    {
        isGameOver = false;
        players.Clear();
        scores.Clear();
        playerColors.Clear();

        UpdateGameState(GameState.Waiting);

        if (uiManager != null)
        {
            uiManager.UpdateStatus("Waiting for players...");
            uiManager.UpdateScore(0);
            uiManager.UpdatePower(0f);
            uiManager.HideGameOver();
        }
        UpdateRuntimeOverlay();

        Debug.Log("[JumpJump] Restarted");
    }

    private void UpdateGameState(GameState state)
    {
        gameState = state;
        UpdateRuntimeOverlay();
    }

    void OnGUI()
    {
        var style = new GUIStyle(GUI.skin.label)
        {
            fontSize = 22,
            normal = { textColor = Color.white }
        };

        GUI.color = new Color(0f, 0f, 0f, 0.7f);
        GUI.Box(new Rect(16, 16, 360, 170), GUIContent.none);
        GUI.color = Color.white;
        GUI.Label(new Rect(32, 28, 320, 24), "Unity ready: yes", style);
        GUI.Label(new Rect(32, 54, 320, 24), $"Receiver hit: {(receiverHit ? "yes" : "no")}", style);
        GUI.Label(new Rect(32, 80, 320, 24), $"Last message: {lastMessageType}", style);
        GUI.Label(new Rect(32, 106, 320, 24), $"Last playerIndex: {lastPlayerIndex}", style);
        GUI.Label(new Rect(32, 132, 320, 24), $"Player count: {players.Count} | State: {gameState} | Tick: {visibleTick}", style);

        if (players.Count > 0 && lastPlayerIndex >= 0)
        {
            Color playerColor = GetColor(lastPlayerIndex);
            GUI.color = new Color(playerColor.r, playerColor.g, playerColor.b, 0.95f);
            GUI.DrawTexture(new Rect(Screen.width * 0.5f - 70, Screen.height * 0.5f - 70, 140, 140), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUIStyle center = new GUIStyle(GUI.skin.label)
            {
                fontSize = 34,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.black }
            };
            GUI.Label(new Rect(Screen.width * 0.5f - 120, Screen.height * 0.5f - 26, 240, 52), $"P{lastPlayerIndex}", center);
        }

        GUI.color = Color.white;
        var hintStyle = new GUIStyle(GUI.skin.label)
        {
            fontSize = 20,
            normal = { textColor = Color.white }
        };
        string hint = gameState == GameState.Waiting
            ? "Scan controller and press button"
            : (gameState == GameState.GameOver ? "Tap to restart" : "Hold/release to jump");
        GUI.Label(new Rect(16, Screen.height - 44, 420, 28), hint, hintStyle);
    }

    private void EnsureRuntimeOverlay()
    {
        if (runtimeOverlayCanvas != null) return;

        var canvasGo = new GameObject("RuntimeGameplayOverlay");
        canvasGo.transform.SetParent(transform, false);

        runtimeOverlayCanvas = canvasGo.AddComponent<Canvas>();
        runtimeOverlayCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
        runtimeOverlayCanvas.sortingOrder = 10000;
        canvasGo.AddComponent<CanvasScaler>();
        canvasGo.AddComponent<GraphicRaycaster>();

        var swatchGo = new GameObject("PlayerSwatch");
        swatchGo.transform.SetParent(canvasGo.transform, false);
        var swatchRect = swatchGo.AddComponent<RectTransform>();
        swatchRect.anchorMin = new Vector2(0.5f, 0.5f);
        swatchRect.anchorMax = new Vector2(0.5f, 0.5f);
        swatchRect.pivot = new Vector2(0.5f, 0.5f);
        swatchRect.anchoredPosition = Vector2.zero;
        swatchRect.sizeDelta = new Vector2(180f, 180f);
        runtimePlayerSwatch = swatchGo.AddComponent<Image>();
        runtimePlayerSwatch.color = new Color(0.35f, 0.35f, 0.35f, 0.75f);

        var labelGo = new GameObject("PlayerLabel");
        labelGo.transform.SetParent(canvasGo.transform, false);
        var labelRect = labelGo.AddComponent<RectTransform>();
        labelRect.anchorMin = new Vector2(0.5f, 0.5f);
        labelRect.anchorMax = new Vector2(0.5f, 0.5f);
        labelRect.pivot = new Vector2(0.5f, 0.5f);
        labelRect.anchoredPosition = new Vector2(0f, -140f);
        labelRect.sizeDelta = new Vector2(360f, 60f);
        runtimePlayerLabel = labelGo.AddComponent<Text>();
        runtimePlayerLabel.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        runtimePlayerLabel.alignment = TextAnchor.MiddleCenter;
        runtimePlayerLabel.fontSize = 34;
        runtimePlayerLabel.color = Color.white;

        var stateGo = new GameObject("StateLabel");
        stateGo.transform.SetParent(canvasGo.transform, false);
        var stateRect = stateGo.AddComponent<RectTransform>();
        stateRect.anchorMin = new Vector2(0.5f, 0.5f);
        stateRect.anchorMax = new Vector2(0.5f, 0.5f);
        stateRect.pivot = new Vector2(0.5f, 0.5f);
        stateRect.anchoredPosition = new Vector2(0f, 160f);
        stateRect.sizeDelta = new Vector2(460f, 120f);
        runtimeStateLabel = stateGo.AddComponent<Text>();
        runtimeStateLabel.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
        runtimeStateLabel.alignment = TextAnchor.MiddleCenter;
        runtimeStateLabel.fontSize = 24;
        runtimeStateLabel.color = Color.white;
    }

    private void UpdateRuntimeOverlay()
    {
        if (runtimeOverlayCanvas == null)
            return;

        if (runtimePlayerSwatch != null)
        {
            if (players.Count > 0 && lastPlayerIndex >= 0)
            {
                var c = GetColor(lastPlayerIndex);
                runtimePlayerSwatch.color = new Color(c.r, c.g, c.b, 0.95f);
            }
            else
            {
                runtimePlayerSwatch.color = new Color(0.35f, 0.35f, 0.35f, 0.75f);
            }
        }

        if (runtimePlayerLabel != null)
        {
            runtimePlayerLabel.text = players.Count > 0 && lastPlayerIndex >= 0
                ? $"P{lastPlayerIndex} • {lastMessageType}"
                : "Scan controller and press";
        }

        if (runtimeStateLabel != null)
        {
            runtimeStateLabel.text = $"State: {gameState}\nPlayers: {players.Count}  Tick: {visibleTick}\nReceiver: {(receiverHit ? "yes" : "no")}";
        }
    }

    private void EnsureSplitScreenRig()
    {
        if (splitScreenRig != null)
        {
            splitScreenRig.primaryCamera = cameraFollow != null ? cameraFollow.GetComponent<Camera>() : splitScreenRig.primaryCamera;
            splitScreenRig.Setup();
            return;
        }

        Camera primaryCamera = cameraFollow != null ? cameraFollow.GetComponent<Camera>() : Camera.main;
        if (primaryCamera == null)
        {
            Debug.LogWarning("[JumpJump] No camera found for split screen rig.");
            return;
        }

        splitScreenRig = SplitScreenCameraRig.Create(primaryCamera);
        splitScreenRig.cameraOffset = cameraFollow != null ? cameraFollow.offset : new Vector3(0f, 5f, -10f);
        splitScreenRig.smoothSpeed = cameraFollow != null ? cameraFollow.smoothSpeed : 5f;
    }
}
