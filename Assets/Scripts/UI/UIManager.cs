using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// UI 管理器
/// 负责更新 UI 元素
/// </summary>
public class UIManager : MonoBehaviour
{
    [Header("UI 引用")]
    [Tooltip("分数文本")]
    public Text scoreText;
    
    [Tooltip("状态文本")]
    public Text statusText;
    
    [Tooltip("游戏结束面板")]
    public GameObject gameOverPanel;
    
    [Header("调试")]
    [Tooltip("是否显示调试信息")]
    public bool enableDebugLog = true;
    
    // 单例引用
    private static UIManager instance;
    public static UIManager Instance
    {
        get
        {
            if (instance == null)
            {
                instance = FindObjectOfType<UIManager>();
            }
            return instance;
        }
    }
    
    #region Unity 生命周期
    
    private void Awake()
    {
        // 单例模式
        if (instance != null && instance != this)
        {
            Destroy(gameObject);
            return;
        }
        
        instance = this;
    }
    
    private void Start()
    {
        // 初始化 UI
        if (scoreText != null)
        {
            scoreText.text = "Score: 0";
        }
        
        if (statusText != null)
        {
            statusText.text = "Waiting for players...";
        }
        
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }
    }
    
    #endregion
    
    #region 公共方法
    
    /// <summary>
    /// 更新分数显示
    /// </summary>
    public void UpdateScore(int score)
    {
        if (scoreText != null)
        {
            scoreText.text = $"Score: {score}";
        }
        
        if (enableDebugLog)
            Debug.Log($"[UIManager] Score updated: {score}");
    }
    
    /// <summary>
    /// 更新状态文本
    /// </summary>
    public void UpdateStatus(string status)
    {
        if (statusText != null)
        {
            statusText.text = status;
        }
        
        if (enableDebugLog)
            Debug.Log($"[UIManager] Status updated: {status}");
    }
    
    /// <summary>
    /// 显示游戏结束面板
    /// </summary>
    public void ShowGameOver(int finalScore, int winnerIndex)
    {
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(true);
            
            // 查找子文本组件
            Text finalScoreText = gameOverPanel.transform.Find("FinalScoreText")?.GetComponent<Text>();
            Text winnerText = gameOverPanel.transform.Find("WinnerText")?.GetComponent<Text>();
            
            if (finalScoreText != null)
            {
                finalScoreText.text = $"Final Score: {finalScore}";
            }
            
            if (winnerText != null)
            {
                winnerText.text = $"Winner: Player {winnerIndex}";
            }
        }
        
        if (enableDebugLog)
            Debug.Log($"[UIManager] Game Over! Winner: Player {winnerIndex}, Score: {finalScore}");
    }
    
    /// <summary>
    /// 隐藏游戏结束面板
    /// </summary>
    public void HideGameOver()
    {
        if (gameOverPanel != null)
        {
            gameOverPanel.SetActive(false);
        }
    }
    
    #endregion
}
