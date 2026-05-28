using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// UI 管理器 — v0.2.6 JumpJump Demo
/// 负责: 分数/状态/蓄力/游戏结束 UI 更新
/// 不负责: 网络通信
/// </summary>
public class UIManager : MonoBehaviour
{
    [Header("UI 引用")]
    public Text scoreText;
    public Text statusText;
    public Text powerText;
    public GameObject gameOverPanel;
    public Text gameOverScoreText;

    [Header("玩家列表 UI")]
    public Transform playersContainer;
    public GameObject playerBadgePrefab;

    void Start()
    {
        if (gameOverPanel != null) gameOverPanel.SetActive(false);
    }

    public void UpdateScore(int score)
    {
        if (scoreText != null)
            scoreText.text = $"Score: {score}";
    }

    public void UpdateStatus(string status)
    {
        if (statusText != null)
            statusText.text = status;
    }

    public void UpdatePower(float power)
    {
        if (powerText != null)
            powerText.text = $"Power: {power:P0}";
    }

    public void ShowGameOver(int finalScore)
    {
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
            if (gameOverScoreText != null)
                gameOverScoreText.text = $"Final Score: {finalScore}";
        }
    }

    public void HideGameOver()
    {
        if (gameOverPanel != null)
            gameOverPanel.SetActive(false);
    }
}
