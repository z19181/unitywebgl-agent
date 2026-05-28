using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class Game2048Manager : MonoBehaviour
{
    [Header("Board")]
    public GridCell[] cells = new GridCell[16];

    [Header("UI")]
    public Text scoreText;
    public Text statusText;
    public GameObject gameOverPanel;
    public Text gameOverText;

    private readonly int[,] board = new int[4, 4];
    private readonly HashSet<int> knownPlayers = new HashSet<int>();
    private int score;
    private int activePlayerIndex;
    private bool gameOver;

    void Start()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage);
        }

        ResetGame();
        UpdateStatus("Swipe to merge tiles");
    }

    void OnDestroy()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.OnMessageReceivedEvent.RemoveListener(OnPlatformMessage);
        }
    }

    public void OnPlatformMessage(PartyGameMessage msg)
    {
        if (msg == null) return;

        switch (msg.type)
        {
            case "player_joined":
            case "player_reconnected":
                knownPlayers.Add(msg.playerIndex);
                if (knownPlayers.Count == 1)
                {
                    activePlayerIndex = msg.playerIndex;
                }
                UpdateStatus($"Player joined: P{msg.playerIndex}");
                break;

            case "player_left":
                knownPlayers.Remove(msg.playerIndex);
                if (knownPlayers.Count == 0)
                {
                    UpdateStatus("Waiting for player...");
                }
                break;

            case "input.direction":
                if (gameOver) return;
                var direction = ParseDirection(msg.data);
                if (!string.IsNullOrEmpty(direction))
                {
                    activePlayerIndex = msg.playerIndex;
                    HandleMove(direction);
                }
                break;
        }
    }

    private void ResetGame()
    {
        score = 0;
        gameOver = false;
        activePlayerIndex = 0;

        for (int y = 0; y < 4; y++)
        {
            for (int x = 0; x < 4; x++)
            {
                board[x, y] = 0;
            }
        }

        SpawnTiles(2);
        RefreshGrid(null);
        UpdateScoreUI();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }
    }

    private void HandleMove(string direction)
    {
        var before = CloneBoard();
        int gainedScore;
        bool moved = ApplyMove(direction, out gainedScore);

        if (!moved)
        {
            UpdateStatus($"P{activePlayerIndex} tried {direction}");
            return;
        }

        score += gainedScore;
        SpawnTiles(2);
        RefreshGrid(before);
        UpdateScoreUI();

        if (gainedScore > 0)
        {
            BroadcastScores();
        }

        if (HasTile(2048))
        {
            UpdateStatus("2048 reached");
        }

        if (!HasMoves())
        {
            EndGame();
        }
        else
        {
            UpdateStatus($"P{activePlayerIndex} moved {direction}");
        }
    }

    private bool ApplyMove(string direction, out int gainedScore)
    {
        gainedScore = 0;
        bool changed = false;

        switch (direction)
        {
            case "left":
                for (int y = 0; y < 4; y++)
                {
                    int[] line = ExtractRow(y, false);
                    int[] merged = MergeLine(line, out int lineScore);
                    gainedScore += lineScore;
                    changed |= WriteRow(y, merged, false);
                }
                break;

            case "right":
                for (int y = 0; y < 4; y++)
                {
                    int[] line = ExtractRow(y, true);
                    int[] merged = MergeLine(line, out int lineScore);
                    gainedScore += lineScore;
                    changed |= WriteRow(y, merged, true);
                }
                break;

            case "up":
                for (int x = 0; x < 4; x++)
                {
                    int[] line = ExtractColumn(x, false);
                    int[] merged = MergeLine(line, out int lineScore);
                    gainedScore += lineScore;
                    changed |= WriteColumn(x, merged, false);
                }
                break;

            case "down":
                for (int x = 0; x < 4; x++)
                {
                    int[] line = ExtractColumn(x, true);
                    int[] merged = MergeLine(line, out int lineScore);
                    gainedScore += lineScore;
                    changed |= WriteColumn(x, merged, true);
                }
                break;
        }

        return changed;
    }

    private int[] ExtractRow(int y, bool reverse)
    {
        var line = new int[4];
        for (int i = 0; i < 4; i++)
        {
            int x = reverse ? 3 - i : i;
            line[i] = board[x, y];
        }
        return line;
    }

    private bool WriteRow(int y, int[] line, bool reverse)
    {
        bool changed = false;
        for (int i = 0; i < 4; i++)
        {
            int x = reverse ? 3 - i : i;
            if (board[x, y] != line[i])
            {
                board[x, y] = line[i];
                changed = true;
            }
        }
        return changed;
    }

    private int[] ExtractColumn(int x, bool reverse)
    {
        var line = new int[4];
        for (int i = 0; i < 4; i++)
        {
            int y = reverse ? 3 - i : i;
            line[i] = board[x, y];
        }
        return line;
    }

    private bool WriteColumn(int x, int[] line, bool reverse)
    {
        bool changed = false;
        for (int i = 0; i < 4; i++)
        {
            int y = reverse ? 3 - i : i;
            if (board[x, y] != line[i])
            {
                board[x, y] = line[i];
                changed = true;
            }
        }
        return changed;
    }

    private int[] MergeLine(int[] line, out int gainedScore)
    {
        gainedScore = 0;
        var compact = new List<int>(4);
        for (int i = 0; i < line.Length; i++)
        {
            if (line[i] > 0)
            {
                compact.Add(line[i]);
            }
        }

        var merged = new List<int>(4);
        for (int i = 0; i < compact.Count; i++)
        {
            if (i + 1 < compact.Count && compact[i] == compact[i + 1])
            {
                int value = compact[i] * 2;
                merged.Add(value);
                gainedScore += value;
                i++;
            }
            else
            {
                merged.Add(compact[i]);
            }
        }

        while (merged.Count < 4)
        {
            merged.Add(0);
        }

        return merged.ToArray();
    }

    private void SpawnTiles(int count)
    {
        for (int i = 0; i < count; i++)
        {
            var empties = GetEmptyCells();
            if (empties.Count == 0)
            {
                break;
            }

            var pos = empties[UnityEngine.Random.Range(0, empties.Count)];
            board[pos.x, pos.y] = UnityEngine.Random.value < 0.9f ? 2 : 4;
        }
    }

    private List<Vector2Int> GetEmptyCells()
    {
        var list = new List<Vector2Int>();
        for (int y = 0; y < 4; y++)
        {
            for (int x = 0; x < 4; x++)
            {
                if (board[x, y] == 0)
                {
                    list.Add(new Vector2Int(x, y));
                }
            }
        }
        return list;
    }

    private bool HasMoves()
    {
        if (GetEmptyCells().Count > 0)
        {
            return true;
        }

        for (int y = 0; y < 4; y++)
        {
            for (int x = 0; x < 4; x++)
            {
                int value = board[x, y];
                if (x + 1 < 4 && board[x + 1, y] == value) return true;
                if (y + 1 < 4 && board[x, y + 1] == value) return true;
            }
        }

        return false;
    }

    private bool HasTile(int target)
    {
        for (int y = 0; y < 4; y++)
        {
            for (int x = 0; x < 4; x++)
            {
                if (board[x, y] >= target)
                {
                    return true;
                }
            }
        }
        return false;
    }

    private void EndGame()
    {
        if (gameOver) return;

        gameOver = true;
        int winner = activePlayerIndex;

        BroadcastGameOver();

        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
        }

        if (gameOverText != null)
        {
            gameOverText.text = $"Game Over\nFinal Score: {score}\nWinner: P{winner}";
        }

        UpdateStatus($"Game Over - P{winner}");
    }

    private void BroadcastScores()
    {
        var dict = new Dictionary<int, int>();
        if (knownPlayers.Count == 0)
        {
            dict[0] = score;
        }
        else
        {
            foreach (int playerIndex in knownPlayers)
            {
                dict[playerIndex] = score;
            }
        }

        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.BroadcastScoreUpdate(dict);
        }
    }

    private void BroadcastGameOver()
    {
        if (PartyGameBridge.Instance != null)
        {
            PartyGameBridge.Instance.BroadcastGameOver(score, activePlayerIndex);
        }
    }

    private void RefreshGrid(int[,] before)
    {
        if (cells == null || cells.Length < 16)
        {
            return;
        }

        for (int y = 0; y < 4; y++)
        {
            for (int x = 0; x < 4; x++)
            {
                int index = y * 4 + x;
                int value = board[x, y];
                bool animate = before != null && before[x, y] != value && value > 0;
                if (cells[index] != null)
                {
                    cells[index].SetValue(value, animate);
                }
            }
        }
    }

    private void UpdateScoreUI()
    {
        if (scoreText != null)
        {
            scoreText.text = $"Score: {score}";
        }
    }

    private void UpdateStatus(string text)
    {
        if (statusText != null)
        {
            statusText.text = text;
        }
    }

    private int[,] CloneBoard()
    {
        var copy = new int[4, 4];
        for (int y = 0; y < 4; y++)
        {
            for (int x = 0; x < 4; x++)
            {
                copy[x, y] = board[x, y];
            }
        }
        return copy;
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
        if (trimmed == "up" || trimmed == "down" || trimmed == "left" || trimmed == "right")
        {
            return trimmed;
        }

        try
        {
            var payload = JsonUtility.FromJson<DirectionPayload>(data);
            if (payload != null && !string.IsNullOrEmpty(payload.direction))
            {
                var value = payload.direction.ToLowerInvariant();
                if (value == "up" || value == "down" || value == "left" || value == "right")
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

    [Serializable]
    private class DirectionPayload
    {
        public string direction;
    }
}
