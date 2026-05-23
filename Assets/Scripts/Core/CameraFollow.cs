using UnityEngine;

/// <summary>
/// 相机跟随脚本
/// 让相机平滑跟随目标物体
/// </summary>
public class CameraFollow : MonoBehaviour
{
    [Header("跟随设置")]
    [Tooltip("跟随目标")]
    public Transform target;
    
    [Tooltip("偏移量")]
    public Vector3 offset = new Vector3(0, 5, -10);
    
    [Tooltip("平滑速度")]
    public float smoothSpeed = 5f;
    
    [Header("调试")]
    [Tooltip("是否显示调试信息")]
    public bool enableDebugLog = true;
    
    private void LateUpdate()
    {
        if (target == null)
        {
            if (enableDebugLog)
                Debug.LogWarning("[CameraFollow] No target set!");
            return;
        }
        
        // 计算目标位置
        Vector3 desiredPosition = target.position + offset;
        
        // 平滑移动
        Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
        
        transform.position = smoothedPosition;
        
        // 看向目标（可选）
        // transform.LookAt(target);
    }
    
    /// <summary>
    /// 设置跟随目标
    /// </summary>
    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
        
        if (enableDebugLog)
            Debug.Log($"[CameraFollow] Target set to {newTarget.name}");
    }
}
