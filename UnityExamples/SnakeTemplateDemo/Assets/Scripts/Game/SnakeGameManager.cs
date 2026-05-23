using System.Collections.Generic;
using UnityEngine;
using System.Collections;

/// <summary>
/// Snake GameManager — v0.2.7 PartyGameSDK Demo
/// 
/// 输入: input.direction (up/down/left/right)
/// 广播: state.score_update (吃食物), state.game_over (撞墙/撞自己)
/// 多人: 每个 controller 独立控制一条蛇
/// </summary>
public class SnakeGameManager : MonoBehaviour
{
    public static SnakeGameManager Instance { get; private set; }

    [Header("网格设置")]
    public int gridWidth = 20;
    public int gridHeight = 20;
    public float cellSize = 0.5f;
    public float tickInterval = 0.3f;

    [Header("预制体")]
    public GameObject snakeHeadPrefab;
    public GameObject snakeBodyPrefab;
    public GameObject foodPrefab;
    public GameObject wallPrefab;

    [Header("颜色")]
    public Color[] playerColors = {
        new Color(0.3f, 0.8f, 0.3f),   // Green
        new Color(0.3f, 0.5f, 1f),     // Blue
        Color.yellow,
        Color.magenta,
    };

    [Header("UI")]
    public SnakeUIManager uiManager;

    // ── 运行时状态 ──
    private Dictionary<int, SnakePlayer> snakes = new Dictionary<int, SnakePlayer>();
    private Dictionary<int, int> scores = new Dictionary<int, int>();
    private HashSet<Vector2Int> occupied = new HashSet<Vector2Int>();
    private Vector2Int foodPos;
    private GameObject foodGo;
    private Dictionary<int, string> pendingDirs = new Dictionary<int, string>();
    private bool isGameOver = false;

    void Awake() { if (Instance != null) { Destroy(gameObject); return; } Instance = this; }

    void Start()
    {
        if (PartyGameBridge.Instance != null)
            PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage);

        // Walls
        BuildWalls();
        // Start loop
        StartCoroutine(GameLoop());
    }

    void OnDestroy()
    {
        if (PartyGameBridge.Instance != null)
            PartyGameBridge.Instance.OnMessageReceivedEvent.RemoveListener(OnPlatformMessage);
        if (Instance == this) Instance = null;
    }

    // ─────────── Message Entry ───────────

    public void OnPlatformMessage(PartyGameMessage msg)
    {
        int pi = msg.playerIndex;

        switch (msg.type)
        {
            case "input.direction":
                string dir = ParseDirection(msg.data);
                if (!string.IsNullOrEmpty(dir))
                    pendingDirs[pi] = dir;
                Debug.Log($"[Snake] P{pi} direction={dir}");
                break;
        }
    }

    string ParseDirection(string data)
    {
        if (string.IsNullOrEmpty(data)) return null;
        // data 可能是纯字符串 "up" 或 JSON {"direction":"up"} 或 "\"up\""
        var d = data.Trim('"').ToLower();
        if (d == "up" || d == "down" || d == "left" || d == "right") return d;
        // 尝试 JSON
        try { var obj = JsonUtility.FromJson<DirectionData>(data); if (obj != null) return obj.direction?.ToLower(); }
        catch { }
        return null;
    }

    // ─────────── 蛇管理 ───────────

    void EnsureSnake(int playerIndex)
    {
        if (snakes.ContainsKey(playerIndex)) return;

        var snake = new SnakePlayer();
        snake.playerIndex = playerIndex;
        snake.color = playerColors[playerIndex % playerColors.Length];

        // 出生位置（分散）
        Vector2Int startPos = new Vector2Int(
            gridWidth / 4 + playerIndex * 3,
            gridHeight / 2
        );
        snake.direction = "right";
        snake.body.Add(startPos);
        occupied.Add(startPos);

        // 渲染
        snake.headGo = CreateBlock(snakeHeadPrefab, startPos, snake.color, $"SnakeHead_{playerIndex}");
        snake.headGo.transform.localScale *= 1.3f;

        snakes[playerIndex] = snake;
        scores[playerIndex] = 0;
        pendingDirs[playerIndex] = "right";

        Debug.Log($"[Snake] P{playerIndex} spawned at {startPos}");
    }

    // ─────────── Game Loop ───────────

    IEnumerator GameLoop()
    {
        SpawnFood();

        while (!isGameOver)
        {
            yield return new WaitForSeconds(tickInterval);
            Tick();
        }
    }

    void Tick()
    {
        // 每人一条蛇
        if (snakes.Count == 0) return;

        var toRemove = new List<int>();

        foreach (var kv in snakes)
        {
            int pi = kv.Key;
            var snake = kv.Value;

            // 方向
            if (pendingDirs.ContainsKey(pi))
            {
                var nd = pendingDirs[pi];
                if (IsOpposite(snake.direction, nd)) {/* 忽略反向 */ }
                else snake.direction = nd;
            }

            // 移动
            Vector2Int newHead = snake.body[0] + DirToVec(snake.direction);

            // 撞墙
            if (newHead.x < 0 || newHead.x >= gridWidth || newHead.y < 0 || newHead.y >= gridHeight)
            {
                KillSnake(pi);
                toRemove.Add(pi);
                continue;
            }

            // 撞自己或其他蛇
            if (occupied.Contains(newHead))
            {
                KillSnake(pi);
                toRemove.Add(pi);
                continue;
            }

            // 吃食物 → 增长
            if (newHead == foodPos)
            {
                snake.body.Insert(0, newHead);
                occupied.Add(newHead);
                scores[pi]++;

                // 渲染新食物
                SpawnFood();

                // ★ 广播分数
                BroadcastScoreUpdate();

                Debug.Log($"[Snake] P{pi} ate food! Score={scores[pi]}");
            }
            else
            {
                // 正常移动
                occupied.Remove(snake.body[snake.body.Count - 1]);
                snake.body.Insert(0, newHead);
                occupied.Add(newHead);
                snake.body.RemoveAt(snake.body.Count - 1);
            }

            // 渲染
            RenderSnake(snake);
        }

        // 清理死蛇
        foreach (var pi in toRemove)
        {
            DestroySnake(pi);
        }

        // 检查结束
        if (snakes.Count == 0)
        {
            EndGame();
        }
    }

    void KillSnake(int playerIndex)
    {
        Debug.Log($"[Snake] P{playerIndex} died");
    }

    void DestroySnake(int playerIndex)
    {
        if (snakes.TryGetValue(playerIndex, out var snake))
        {
            if (snake.headGo) Destroy(snake.headGo);
            foreach (var b in snake.bodyGos) if (b) Destroy(b);
            foreach (var b in snake.body) occupied.Remove(b);
            snakes.Remove(playerIndex);
        }
    }

    void EndGame()
    {
        if (isGameOver) return;
        isGameOver = true;

        int winner = 0, best = 0;
        foreach (var kv in scores) { if (kv.Value > best) { best = kv.Value; winner = kv.Key; } }

        broadcastGameOver(best, winner);

        if (uiManager)
        {
            uiManager.UpdateStatus("🏁 Game Over! Winner: P" + winner);
            uiManager.ShowGameOver(best);
        }

        Debug.Log($"[Snake] Game Over! Winner: P{winner}, Score: {best}");
    }

    // ─────────── 渲染 ───────────

    void RenderSnake(SnakePlayer snake)
    {
        if (snake.headGo) snake.headGo.transform.position = GridToWorld(snake.body[0]);

        // 身体
        while (snake.bodyGos.Count < snake.body.Count - 1)
        {
            var go = CreateBlock(snakeBodyPrefab, Vector2Int.zero, snake.color * 0.7f, $"Body_{snake.playerIndex}_{snake.bodyGos.Count}");
            snake.bodyGos.Add(go);
        }
        while (snake.bodyGos.Count > snake.body.Count - 1)
        {
            Destroy(snake.bodyGos[snake.bodyGos.Count - 1]);
            snake.bodyGos.RemoveAt(snake.bodyGos.Count - 1);
        }
        for (int i = 1; i < snake.body.Count; i++)
            snake.bodyGos[i - 1].transform.position = GridToWorld(snake.body[i]);
    }

    GameObject CreateBlock(GameObject prefab, Vector2Int pos, Color color, string name)
    {
        var go = prefab ? Instantiate(prefab) : GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = name;
        go.transform.position = GridToWorld(pos);
        var r = go.GetComponent<Renderer>();
        if (r) r.material.color = color;
        go.transform.localScale = Vector3.one * cellSize;
        return go;
    }

    // ─────────── 食物 ───────────

    void SpawnFood()
    {
        if (foodGo) Destroy(foodGo);

        var avail = new List<Vector2Int>();
        for (int x = 0; x < gridWidth; x++)
            for (int y = 0; y < gridHeight; y++)
                if (!occupied.Contains(new Vector2Int(x, y)))
                    avail.Add(new Vector2Int(x, y));

        if (avail.Count == 0) { EndGame(); return; }

        foodPos = avail[Random.Range(0, avail.Count)];
        foodGo = CreateBlock(foodPrefab, foodPos, Color.red, "Food");
        foodGo.transform.localScale *= 0.7f;
    }

    // ─────────── 墙壁 ───────────

    void BuildWalls()
    {
        for (int x = -1; x <= gridWidth; x++)
        {
            CreateBlock(wallPrefab, new Vector2Int(x, -1), Color.gray, $"Wall_L_{x}");
            CreateBlock(wallPrefab, new Vector2Int(x, gridHeight), Color.gray, $"Wall_R_{x}");
        }
        for (int y = 0; y < gridHeight; y++)
        {
            CreateBlock(wallPrefab, new Vector2Int(-1, y), Color.gray, $"Wall_B_{y}");
            CreateBlock(wallPrefab, new Vector2Int(gridWidth, y), Color.gray, $"Wall_T_{y}");
        }
    }

    // ─────────── 广播 ───────────

    void BroadcastScoreUpdate()
    {
        if (PartyGameBridge.Instance == null) return;
        PartyGameBridge.Instance.BroadcastScoreUpdate(scores);
    }

    void broadcastGameOver(int finalScore, int winnerIndex)
    {
        if (PartyGameBridge.Instance == null) return;
        PartyGameBridge.Instance.BroadcastGameOver(finalScore, winnerIndex);
    }

    // ─────────── 工具 ───────────

    Vector3 GridToWorld(Vector2Int g) => new Vector3(g.x * cellSize - gridWidth * cellSize / 2f, g.y * cellSize + cellSize, 0);

    static Vector2Int DirToVec(string d) => d switch
    {
        "up"    => new Vector2Int(0, 1),
        "down"  => new Vector2Int(0, -1),
        "left"  => new Vector2Int(-1, 0),
        "right" => new Vector2Int(1, 0),
        _       => Vector2Int.zero,
    };

    static bool IsOpposite(string a, string b) =>
        (a == "up" && b == "down") || (a == "down" && b == "up") ||
        (a == "left" && b == "right") || (a == "right" && b == "left");
}

// ─────────── 数据结构 ───────────

[System.Serializable]
public class DirectionData { public string direction; }

public class SnakePlayer
{
    public int playerIndex;
    public Color color;
    public string direction;
    public List<Vector2Int> body = new List<Vector2Int>();
    public GameObject headGo;
    public List<GameObject> bodyGos = new List<GameObject>();
}

/// <summary>
/// Snake UI 管理器
/// </summary>
public class SnakeUIManager : MonoBehaviour
{
    public UnityEngine.UI.Text scoreText;
    public UnityEngine.UI.Text statusText;
    public UnityEngine.UI.Text powerText;
    public GameObject gameOverPanel;
    public UnityEngine.UI.Text gameOverScoreText;

    public void UpdateScore(int s) { if (scoreText) scoreText.text = $"Score: {s}"; }
    public void UpdateStatus(string s) { if (statusText) statusText.text = s; }
    public void ShowGameOver(int s) { if (gameOverPanel) { gameOverPanel.SetActive(true); if (gameOverScoreText) gameOverScoreText.text = $"Final Score: {s}"; } }
}
