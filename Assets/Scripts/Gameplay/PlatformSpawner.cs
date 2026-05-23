using UnityEngine;

/// <summary>
/// 平台生成器
/// 负责动态生成和回收平台
/// </summary>
public class PlatformSpawner : MonoBehaviour
{
    [Header("平台设置")]
    [Tooltip("平台预制体")]
    public GameObject platformPrefab;
    
    [Tooltip("初始平台数量")]
    public int initialPlatformCount = 5;
    
    [Tooltip("平台间距范围")]
    public Vector2 distanceRange = new Vector2(3f, 6f);
    
    [Tooltip("平台宽度")]
    public float platformWidth = 2f;
    
    [Tooltip("是否随机化平台大小")]
    public bool randomizeSize = true;
    
    [Header("调试")]
    [Tooltip("是否显示调试信息")]
    public bool enableDebugLog = true;
    
    // 平台列表
    private GameObject[] platforms;
    private int currentPlatformIndex = 0;
    
    #region Unity 生命周期
    
    private void Start()
    {
        // 初始化平台
        SpawnInitialPlatforms();
    }
    
    #endregion
    
    #region 平台生成
    
    /// <summary>
    /// 生成初始平台
    /// </summary>
    public void SpawnInitialPlatforms()
    {
        if (platformPrefab == null)
        {
            Debug.LogError("[PlatformSpawner] platformPrefab is null!");
            return;
        }
        
        platforms = new GameObject[initialPlatformCount];
        
        // 第一个平台在原点
        Vector3 spawnPosition = Vector3.zero;
        
        for (int i = 0; i < initialPlatformCount; i++)
        {
            // 实例化平台
            GameObject platform = Instantiate(platformPrefab, spawnPosition, Quaternion.identity);
            platform.name = $"Platform_{i}";
            platform.transform.SetParent(transform);
            
            // 随机化大小
            if (randomizeSize)
            {
                float randomWidth = Random.Range(platformWidth * 0.5f, platformWidth * 1.5f);
                platform.transform.localScale = new Vector3(randomWidth, 0.5f, randomWidth);
            }
            
            platforms[i] = platform;
            
            // 计算下一个平台位置
            if (i < initialPlatformCount - 1)
            {
                float distance = Random.Range(distanceRange.x, distanceRange.y);
                spawnPosition += new Vector3(distance, 0, 0);
            }
        }
        
        if (enableDebugLog)
            Debug.Log($"[PlatformSpawner] Spawned {initialPlatformCount} platforms");
    }
    
    /// <summary>
    /// 生成下一个平台
    /// </summary>
    public void SpawnNextPlatform()
    {
        // 计算新平台位置
        GameObject lastPlatform = platforms[currentPlatformIndex];
        float distance = Random.Range(distanceRange.x, distanceRange.y);
        Vector3 newPosition = lastPlatform.transform.position + new Vector3(distance, 0, 0);
        
        // 实例化新平台
        GameObject newPlatform = Instantiate(platformPrefab, newPosition, Quaternion.identity);
        newPlatform.name = $"Platform_{currentPlatformIndex + initialPlatformCount}";
        newPlatform.transform.SetParent(transform);
        
        // 随机化大小
        if (randomizeSize)
        {
            float randomWidth = Random.Range(platformWidth * 0.5f, platformWidth * 1.5f);
            newPlatform.transform.localScale = new Vector3(randomWidth, 0.5f, randomWidth);
        }
        
        // 更新列表
        platforms[currentPlatformIndex] = newPlatform;
        currentPlatformIndex = (currentPlatformIndex + 1) % initialPlatformCount;
        
        if (enableDebugLog)
            Debug.Log($"[PlatformSpawner] Spawned new platform at {newPosition}");
    }
    
    #endregion
}
