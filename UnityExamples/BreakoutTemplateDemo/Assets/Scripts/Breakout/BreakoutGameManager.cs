using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class BreakoutGameManager : MonoBehaviour
{
    [Header("Layout")]
    [SerializeField] private float paddleY = -7.2f;
    [SerializeField] private float ballStartY = -6.1f;
    [SerializeField] private float ballSpeed = 8f;
    [SerializeField] private int brickRows = 5;
    [SerializeField] private int brickCols = 8;
    [SerializeField] private float brickWidth = 1.5f;
    [SerializeField] private float brickHeight = 0.6f;
    [SerializeField] private float brickPadding = 0.1f;
    [SerializeField] private float brickStartY = 4.5f;

    [Header("UI")]
    public Text scoreText;
    public Text statusText;
    public GameObject gameOverPanel;
    public Text gameOverScoreText;

    private readonly Dictionary<int, PaddleController> paddles = new Dictionary<int, PaddleController>();
    private readonly Dictionary<int, BallController> balls = new Dictionary<int, BallController>();
    private readonly Dictionary<int, int> scores = new Dictionary<int, int>();
    private readonly HashSet<int> connectedPlayers = new HashSet<int>();
    private readonly List<GameObject> bricks = new List<GameObject>();

    private Sprite whiteSprite;
    private bool gameOver;

    private void Start()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage);
        }

        CreateWalls();
        CreateBricks();
        UpdateScoreUI();
        UpdateStatus("Join to spawn paddles");
    }

    private void OnDestroy()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.RemoveListener(OnPlatformMessage);
        }
    }

    public void OnPlatformMessage(PartyGameMessage msg)
    {
        if (msg == null || gameOver && msg.type != "player_joined" && msg.type != "player_reconnected")
        {
            return;
        }

        switch (msg.type)
        {
            case "player_joined":
            case "player_reconnected":
                connectedPlayers.Add(msg.playerIndex);
                EnsurePlayer(msg.playerIndex);
                UpdateScoreUI();
                UpdateStatus($"Player joined: P{msg.playerIndex}");
                break;

            case "player_left":
                RemovePlayer(msg.playerIndex);
                UpdateScoreUI();
                UpdateStatus($"Player left: P{msg.playerIndex}");
                break;

            case "input.move":
                HandleMove(msg);
                break;

            case "input.direction":
                HandleDirectionFallback(msg);
                break;

            case "input.tap":
                HandleTap(msg);
                break;
        }
    }

    private void EnsurePlayer(int playerIndex)
    {
        if (paddles.ContainsKey(playerIndex))
        {
            return;
        }

        float t = Mathf.Clamp01(paddles.Count / 3f);
        float offsetX = Mathf.Lerp(-4.5f, 4.5f, t);

        var paddle = CreatePaddle($"Paddle_{playerIndex}", new Vector3(offsetX, paddleY, 0f), PlayerColor(playerIndex));
        paddles[playerIndex] = paddle;
        scores[playerIndex] = 0;

        var ball = CreateBall($"Ball_{playerIndex}", new Vector3(offsetX, ballStartY, 0f), PlayerColor(playerIndex), paddle.transform, playerIndex);
        balls[playerIndex] = ball;
    }

    private void RemovePlayer(int playerIndex)
    {
        connectedPlayers.Remove(playerIndex);

        if (paddles.TryGetValue(playerIndex, out var paddle))
        {
            Destroy(paddle.gameObject);
            paddles.Remove(playerIndex);
        }

        if (balls.TryGetValue(playerIndex, out var ball))
        {
            Destroy(ball.gameObject);
            balls.Remove(playerIndex);
        }

        scores.Remove(playerIndex);
        CheckGameOver();
    }

    private void HandleMove(PartyGameMessage msg)
    {
        if (!paddles.ContainsKey(msg.playerIndex))
        {
            EnsurePlayer(msg.playerIndex);
        }

        float move = ParseMoveInput(msg.data);
        if (paddles.TryGetValue(msg.playerIndex, out var paddle))
        {
            paddle.Move(move);
            UpdateStatus($"P{msg.playerIndex} move={move:0.00}");
        }
    }

    private void HandleDirectionFallback(PartyGameMessage msg)
    {
        if (!paddles.ContainsKey(msg.playerIndex))
        {
            EnsurePlayer(msg.playerIndex);
        }

        string direction = ParseDirection(msg.data);
        if (string.IsNullOrEmpty(direction))
        {
            return;
        }

        float move = 0f;
        if (direction == "left") move = -1f;
        if (direction == "right") move = 1f;

        if (paddles.TryGetValue(msg.playerIndex, out var paddle))
        {
            paddle.Move(move);
            UpdateStatus($"P{msg.playerIndex} dir={direction}");
        }
    }

    private void HandleTap(PartyGameMessage msg)
    {
        if (!balls.ContainsKey(msg.playerIndex))
        {
            EnsurePlayer(msg.playerIndex);
        }

        if (balls.TryGetValue(msg.playerIndex, out var ball))
        {
            ball.Launch();
            UpdateStatus($"P{msg.playerIndex} launch");
        }
    }

    private PaddleController CreatePaddle(string name, Vector3 position, Color color)
    {
        var go = new GameObject(name);
        go.transform.position = position;

        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = WhiteSprite();
        sr.color = color;
        go.transform.localScale = new Vector3(2.2f, 0.35f, 1f);

        var body = go.AddComponent<Rigidbody2D>();
        body.bodyType = RigidbodyType2D.Kinematic;
        body.gravityScale = 0f;

        var collider = go.AddComponent<BoxCollider2D>();
        collider.size = Vector2.one;

        var paddle = go.AddComponent<PaddleController>();
        paddle.SetBounds(-7.4f, 7.4f);
        return paddle;
    }

    private BallController CreateBall(string name, Vector3 position, Color color, Transform paddle, int ownerIndex)
    {
        var go = new GameObject(name);
        go.transform.position = position;

        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = WhiteSprite();
        sr.color = color;
        go.transform.localScale = Vector3.one * 0.48f;

        var body = go.AddComponent<Rigidbody2D>();
        body.bodyType = RigidbodyType2D.Dynamic;
        body.gravityScale = 0f;
        body.freezeRotation = true;
        body.collisionDetectionMode = CollisionDetectionMode2D.Continuous;

        var collider = go.AddComponent<CircleCollider2D>();
        collider.radius = 0.5f;

        var ball = go.AddComponent<BallController>();
        ball.Initialize(ownerIndex, paddle, ballSpeed, -9.5f);
        ball.onBrickHit += scoreDelta =>
        {
            scores[ownerIndex] = scores.TryGetValue(ownerIndex, out var score) ? score + scoreDelta : scoreDelta;
            bricks.RemoveAll(brick => brick == null);
            BroadcastScores();
            UpdateScoreUI();
            if (bricks.Count == 0)
            {
                EndGame();
            }
        };
        ball.onBallLost += () =>
        {
            balls.Remove(ownerIndex);
            UpdateStatus($"P{ownerIndex} ball lost");
            CheckGameOver();
        };
        return ball;
    }

    private void CreateWalls()
    {
        CreateStaticWall("LeftWall", new Vector3(-8.5f, 0f, 0f), new Vector2(0.5f, 18f));
        CreateStaticWall("RightWall", new Vector3(8.5f, 0f, 0f), new Vector2(0.5f, 18f));
        CreateStaticWall("TopWall", new Vector3(0f, 8.6f, 0f), new Vector2(18f, 0.5f));
    }

    private void CreateStaticWall(string name, Vector3 position, Vector2 size)
    {
        var go = new GameObject(name);
        go.transform.position = position;
        var collider = go.AddComponent<BoxCollider2D>();
        collider.size = size;
    }

    private void CreateBricks()
    {
        float totalWidth = brickCols * (brickWidth + brickPadding) - brickPadding;
        float startX = -totalWidth / 2f + brickWidth / 2f;

        for (int row = 0; row < brickRows; row++)
        {
            for (int col = 0; col < brickCols; col++)
            {
                float x = startX + col * (brickWidth + brickPadding);
                float y = brickStartY - row * (brickHeight + brickPadding);
                var brick = CreateBrick($"Brick_{row}_{col}", new Vector3(x, y, 0f), row);
                bricks.Add(brick);
            }
        }
    }

    private GameObject CreateBrick(string name, Vector3 position, int rowIndex)
    {
        var go = new GameObject(name);
        go.tag = "Brick";
        go.transform.position = position;

        var sr = go.AddComponent<SpriteRenderer>();
        sr.sprite = WhiteSprite();
        float hue = (float)rowIndex / Mathf.Max(1, brickRows);
        sr.color = Color.HSVToRGB(hue, 0.65f, 0.92f);
        go.transform.localScale = new Vector3(brickWidth, brickHeight, 1f);

        var collider = go.AddComponent<BoxCollider2D>();
        collider.size = Vector2.one;

        return go;
    }

    private void BroadcastScores()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.BroadcastScoreUpdate(new Dictionary<int, int>(scores));
        }
    }

    private void CheckGameOver()
    {
        bool allBallsLost = balls.Count == 0 && connectedPlayers.Count > 0;
        bool allBricksGone = bricks.TrueForAll(brick => brick == null);

        if (allBallsLost || allBricksGone)
        {
            EndGame();
        }
    }

    private void EndGame()
    {
        if (gameOver)
        {
            return;
        }

        gameOver = true;

        int winnerIndex = -1;
        int maxScore = -1;
        foreach (var kv in scores)
        {
            if (kv.Value > maxScore)
            {
                maxScore = kv.Value;
                winnerIndex = kv.Key;
            }
        }

        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.BroadcastGameOver(maxScore < 0 ? 0 : maxScore, winnerIndex);
        }

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
        }

        if (gameOverScoreText != null)
        {
            gameOverScoreText.text = $"Game Over\nFinal Score: {Mathf.Max(maxScore, 0)}\nWinner: P{winnerIndex}";
        }

        UpdateStatus($"Game Over - P{winnerIndex}");
    }

    private void UpdateScoreUI()
    {
        if (scoreText == null)
        {
            return;
        }

        if (scores.Count == 0)
        {
            scoreText.text = "Score: 0";
            return;
        }

        var parts = new List<string>();
        foreach (var kv in scores)
        {
            parts.Add($"P{kv.Key} {kv.Value}");
        }

        scoreText.text = "Scores: " + string.Join(" | ", parts);
    }

    private void UpdateStatus(string text)
    {
        if (statusText != null)
        {
            statusText.text = text;
        }
    }

    private float ParseMoveInput(string data)
    {
        if (string.IsNullOrEmpty(data))
        {
            return 0f;
        }

        var trimmed = data.Trim();
        if (trimmed.StartsWith("\"") && trimmed.EndsWith("\"") && trimmed.Length >= 2)
        {
            trimmed = trimmed.Substring(1, trimmed.Length - 2);
        }

        if (float.TryParse(trimmed, out float direct))
        {
            return Mathf.Clamp(direct, -1f, 1f);
        }

        try
        {
            var payload = JsonUtility.FromJson<MovePayload>(data);
            if (payload != null)
            {
                return Mathf.Clamp(payload.x, -1f, 1f);
            }
        }
        catch
        {
            // ignore malformed payloads
        }

        return 0f;
    }

    private string ParseDirection(string data)
    {
        if (string.IsNullOrEmpty(data))
        {
            return null;
        }

        var trimmed = data.Trim();
        if (trimmed.StartsWith("\"") && trimmed.EndsWith("\"") && trimmed.Length >= 2)
        {
            trimmed = trimmed.Substring(1, trimmed.Length - 2);
        }

        trimmed = trimmed.ToLowerInvariant();
        if (trimmed == "left" || trimmed == "right")
        {
            return trimmed;
        }

        try
        {
            var payload = JsonUtility.FromJson<DirectionPayload>(data);
            if (payload != null && !string.IsNullOrEmpty(payload.direction))
            {
                var value = payload.direction.ToLowerInvariant();
                if (value == "left" || value == "right")
                {
                    return value;
                }
            }
        }
        catch
        {
            // ignore malformed payloads
        }

        return null;
    }

    private Color PlayerColor(int playerIndex)
    {
        Color[] palette =
        {
            new Color(1f, 0.35f, 0.35f),
            new Color(0.35f, 0.6f, 1f),
            new Color(0.35f, 1f, 0.45f),
            new Color(1f, 0.84f, 0.3f),
            new Color(0.85f, 0.4f, 1f),
            new Color(1f, 0.56f, 0.25f)
        };

        return palette[Mathf.Abs(playerIndex) % palette.Length];
    }

    private Sprite WhiteSprite()
    {
        if (whiteSprite != null)
        {
            return whiteSprite;
        }

        var texture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
        texture.SetPixel(0, 0, Color.white);
        texture.Apply();
        whiteSprite = Sprite.Create(texture, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 100f);
        return whiteSprite;
    }

    [System.Serializable]
    private class MovePayload
    {
        public float x;
    }

    [System.Serializable]
    private class DirectionPayload
    {
        public string direction;
    }
}
