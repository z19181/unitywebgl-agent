using UnityEngine;

/// <summary>
/// 玩家控制器 - 处理跳跃和落地检测
/// 
/// 功能：
/// 1. 接收蓄力输入
/// 2. 执行跳跃（物理）
/// 3. 检测落地
/// 4. 通知 GameManager 加分
/// </summary>
public class PlayerJump : MonoBehaviour
{
    [Header("跳跃设置")]
    [Tooltip("基础跳跃力度")]
    public float baseJumpForce = 10f;
    
    [Tooltip("最大蓄力倍数")]
    public float maxChargeMultiplier = 2f;
    
    [Header("落地检测")]
    [Tooltip("落地检测射线长度")]
    public float groundCheckDistance = 1.1f;
    
    [Tooltip("落地检测层级")]
    public LayerMask groundLayer;
    
    [Header("调试")]
    [Tooltip("是否显示调试信息")]
    public bool enableDebugLog = true;
    
    // 组件引用
    private Rigidbody rb;
    private bool isGrounded = true;
    private bool hasLanded = false;  // 标记是否已经落地一次（防止重复触发）
    private int playerIndex = -1;
    
    // 跳跃状态
    private bool isCharging = false;
    private float chargeStartTime = 0f;
    private float maxChargeTime = 2f;  // 最大蓄力时间（秒）
    
    #region Unity 生命周期
    
    private void Awake()
    {
        rb = GetComponent<Rigidbody>();
        
        if (rb == null)
        {
            Debug.LogError($"[{gameObject.name}] Missing Rigidbody!");
        }
    }
    
    private void Update()
    {
        // 检测落地
        CheckGrounded();
    }
    
    private void OnDestroy()
    {
        // 清理
    }
    
    #endregion
    
    #region 玩家索引管理
    
    /// <summary>
    /// 设置玩家索引（由 GameManager 调用）
    /// </summary>
    public void SetPlayerIndex(int index)
    {
        playerIndex = index;
        
        if (enableDebugLog)
            Debug.Log($"[{gameObject.name}] Player index set to {playerIndex}");
    }
    
    #endregion
    
    #region 跳跃控制（测试点 10：Unity 能执行跳跃）
    
    /// <summary>
    /// 开始蓄力
    /// </summary>
    public void StartCharge()
    {
        if (!isGrounded)
        {
            if (enableDebugLog)
                Debug.Log($"[{gameObject.name}] Cannot charge: not grounded");
            return;
        }
        
        isCharging = true;
        chargeStartTime = Time.time;
        
        if (enableDebugLog)
            Debug.Log($"[{gameObject.name}] Started charging");
    }
    
    /// <summary>
    /// 执行跳跃（测试点 10）
    /// </summary>
    /// <param name="jumpForce">跳跃力度（由蓄力百分比计算）</param>
    public void ExecuteJump(float jumpForce)
    {
        if (rb == null) return;
        
        // 施加跳跃力
        Vector3 jumpDirection = Vector3.up + Vector3.right;  // 向上 + 向前
        jumpDirection = jumpDirection.normalized;
        
        rb.AddForce(jumpDirection * jumpForce, ForceMode.Impulse);
        
        isCharging = false;
        isGrounded = false;
        hasLanded = false;  // 重置落地标记
        
        if (enableDebugLog)
            Debug.Log($"[{gameObject.name}] Jumped with force: {jumpForce}");
    }
    
    /// <summary>
    /// Tap 跳跃（简易跳跃，固定力度）
    /// </summary>
    public void TapJump()
    {
        ExecuteJump(baseJumpForce);
    }
    
    #endregion
    
    #region 落地检测（测试点 10：落地判断、加分）
    
    /// <summary>
    /// 检测是否落地
    /// </summary>
    private void CheckGrounded()
    {
        // 向下发射射线检测地面
        Ray ray = new Ray(transform.position, Vector3.down);
        bool wasGrounded = isGrounded;
        
        isGrounded = Physics.Raycast(ray, groundCheckDistance, groundLayer);
        
        // 落地瞬间
        if (isGrounded && !wasGrounded && !hasLanded)
        {
            OnLanded();
        }
    }
    
    /// <summary>
    /// 落地处理（测试点 10：加分）
    /// </summary>
    private void OnLanded()
    {
        hasLanded = true;
        
        if (enableDebugLog)
            Debug.Log($"[{gameObject.name}] Landed!");
        
        // 通知 GameManager（测试点 10：加分）
        if (GameManager.Instance != null && playerIndex >= 0)
        {
            GameManager.Instance.OnPlayerLanded(playerIndex);
        }
        else
        {
            Debug.LogWarning($"[{gameObject.name}] Cannot notify GameManager: Instance={GameManager.Instance != null}, playerIndex={playerIndex}");
        }
    }
    
    #endregion
    
    #region 调试可视化
    
    private void OnDrawGizmos()
    {
        // 绘制落地检测射线
        Gizmos.color = isGrounded ? Color.green : Color.red;
        Gizmos.DrawLine(transform.position, transform.position + Vector3.down * groundCheckDistance);
    }
    
    #endregion
}
