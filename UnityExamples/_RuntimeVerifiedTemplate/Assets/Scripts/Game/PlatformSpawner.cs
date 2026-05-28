using UnityEngine;

/// <summary>
/// 平台生成器 — v0.2.6 JumpJump Demo
/// 动态生成平台，支持回收复用
/// </summary>
public class PlatformSpawner : MonoBehaviour
{
    [Header("平台设置")]
    public GameObject platformPrefab;
    public int poolSize = 10;
    public float distanceMin = 3f;
    public float distanceMax = 6f;
    public float platformWidth = 2f;
    public bool randomizeSize = true;

    private GameObject[] pool;
    private int poolIndex;
    private Vector3 nextSpawnPos;

    void Start()
    {
        if (platformPrefab == null)
        {
            Debug.LogError("[PlatformSpawner] platformPrefab is null!");
            return;
        }

        pool = new GameObject[poolSize];
        nextSpawnPos = Vector3.zero;

        for (int i = 0; i < poolSize; i++)
        {
            pool[i] = SpawnPlatform(nextSpawnPos, $"Platform_{i}");
            nextSpawnPos.x += Random.Range(distanceMin, distanceMax);
        }
    }

    public void SpawnNext()
    {
        // Recycle oldest platform
        GameObject old = pool[poolIndex];
        old.transform.position = nextSpawnPos;

        if (randomizeSize)
        {
            float w = Random.Range(platformWidth * 0.5f, platformWidth * 1.5f);
            old.transform.localScale = new Vector3(w, 0.5f, w);
        }

        nextSpawnPos.x += Random.Range(distanceMin, distanceMax);
        poolIndex = (poolIndex + 1) % poolSize;
    }

    GameObject SpawnPlatform(Vector3 pos, string name)
    {
        var go = Instantiate(platformPrefab, pos, Quaternion.identity, transform);
        go.name = name;
        if (randomizeSize)
        {
            float w = Random.Range(platformWidth * 0.5f, platformWidth * 1.5f);
            go.transform.localScale = new Vector3(w, 0.5f, w);
        }
        return go;
    }
}
